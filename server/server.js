const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;


// const pool = new Pool({
//     user: process.env.PG_USER,
//     host: process.env.PG_HOST,
//     database: process.env.PG_DATABASE,
//     password: process.env.PG_PASSWORD,
//     port: process.env.PG_PORT,  
// });
const pool = new Pool({
    connectionString: process.env.NeonPGURL
});

//Test db
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database!');
        return client.query(`
            CREATE TABLE IF NOT EXISTS polls (
                id VARCHAR(255) PRIMARY KEY,
                question TEXT NOT NULL,
                options JSONB NOT NULL, -- Stores array of {id, text, votes}
                status VARCHAR(50) NOT NULL,
                created_at BIGINT NOT NULL,
                ended_at BIGINT,
                max_time INTEGER NOT NULL,
                correct_option_id INTEGER,         -- NEW: Stores the ID of the correct option
                correct_answers_count INTEGER DEFAULT 0 -- NEW: Stores how many answered correctly
            );
        `);
    })
    .then(() => {
        console.log('Polls table ensured to exist.');
    })
    .catch(err => {
        console.error('Database connection or table creation error:', err);
        process.exit(1);
    });

let currentPoll = null; 
const activeStudents = {};
const chatMessages = []; 

let currentPollCorrectAnswers = 0;

function generateUniqueId() {
    return `_${Math.random().toString(36).substring(2, 9)}`;
}

function broadcastPollState() {
    const pollForClients = { ...currentPoll };
    if (pollForClients && pollForClients.correctOptionId !== undefined) { 
        delete pollForClients.correctOptionId; 
    }
    io.emit('pollStateUpdate', pollForClients);
}

//Function to update and broadcast student answered count
function updateStudentAnsweredCount() {
    let answeredCount = 0;
    let totalActiveStudents = 0;

    for (const studentSocketId in activeStudents) {
        if (activeStudents.hasOwnProperty(studentSocketId)) {
            totalActiveStudents++;
            //Check if the student answered the current active poll
            if (activeStudents[studentSocketId].answered && activeStudents[studentSocketId].currentPollId === (currentPoll ? currentPoll.pollId : null)) {
                answeredCount++;
            }
        }
    }
    //Update total students in the current poll object for teacher dashboard display
    if (currentPoll) {
        currentPoll.totalStudents = totalActiveStudents;
        currentPoll.studentsAnswered = answeredCount;
    }
    io.emit('studentAnsweredCount', { answered: answeredCount, total: totalActiveStudents });
}

//Function to broadcast list of active students to all clients
function broadcastActiveStudentsList() {
    const studentList = Object.keys(activeStudents).map(id => ({
        id: id,
        name: activeStudents[id].name,
    }));
    io.emit('activeStudentsList', studentList);
    console.log("Broadcasted active student list:", studentList.map(s => s.name).join(', '));
}

//Function to broadcast chat messages to clients
function broadcastChatMessages() {
    io.emit('chatMessagesUpdate', chatMessages.slice(-50));
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit('currentPollState', currentPoll);
    updateStudentAnsweredCount();
    broadcastActiveStudentsList(); 
    broadcastChatMessages(); 

    socket.on('studentConnected', (studentSocketId, studentName) => {
    if (!activeStudents[studentSocketId]) {
        activeStudents[studentSocketId] = {
            name: studentName,
            answered: false,
            currentPollId: currentPoll ? currentPoll.pollId : null,
            socketId: studentSocketId
        };
        console.log(`Student ${studentName} (${studentSocketId}) joined.`);
    }
    socket.emit('studentHasAnswered', activeStudents[studentSocketId].answered);
    updateStudentAnsweredCount();
    broadcastActiveStudentsList();
});

    //Teacher creates a new poll
    socket.on('createPoll', async (newPoll) => {
        if (currentPoll && currentPoll.status === 'active') {
            console.log("Cannot create new poll: an active poll already exists.");
            // Optionally, emit an error back to the teacher
            socket.emit('error', 'An active poll already exists. Please end it first.');
            return;
        }

        //Assign a unique ID to the new poll
        newPoll.pollId = generateUniqueId();
        newPoll.status = 'active';
        newPoll.createdAt = Date.now(); 
        newPoll.endedAt = null; 
        newPoll.correctAnswersCount = 0; 

        //Reset
        currentPollCorrectAnswers = 0;

        //Store currentPoll in memory for quick access
        currentPoll = {
            ...newPoll,
            totalStudents: 0,
            studentsAnswered: 0,
            correctOptionId: newPoll.correctOptionId
        };

        try {
            const res = await pool.query(
                `INSERT INTO polls (id, question, options, status, created_at, max_time, correct_option_id, correct_answers_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [newPoll.pollId, newPoll.question, JSON.stringify(newPoll.options), newPoll.status, newPoll.createdAt, newPoll.maxTime, newPoll.correctOptionId, newPoll.correctAnswersCount]
            );
            console.log('Poll saved to DB:', res.rows[0].id);
        } catch (err) {
            console.error('Error saving poll to DB:', err);
            socket.emit('error', 'Failed to create poll in database.');
            currentPoll = null;
            return;
        }

        //Reset student answered status for all active students
        for (const studentSocketId in activeStudents) {
            if (activeStudents.hasOwnProperty(studentSocketId)) {
                activeStudents[studentSocketId].answered = false;
                activeStudents[studentSocketId].currentPollId = currentPoll.pollId;
            }
        }

        broadcastPollState(); 
        updateStudentAnsweredCount();
    });

    //Student submits a vote
    socket.on('submitVote', async ({ pollId, optionId, studentId, studentName }) => {
        if (!currentPoll || currentPoll.pollId !== pollId || currentPoll.status !== 'active') {
            console.log(`Vote for poll ${pollId} rejected: poll not     active or invalid.`);
            return;
        }

        //Check if student has already answered this poll
        if (activeStudents[studentId] && activeStudents[studentId].answered && activeStudents[studentId].currentPollId === pollId) {
            console.log(`Student ${studentName} (${studentId}) already answered poll ${pollId}.`);
            return;
        }

        const option = currentPoll.options.find(opt => opt.id === optionId);
        if (option) {
            option.votes++;
            console.log(`Vote received for "${option.text}" (Option ID: ${optionId}) from ${studentName}. Current votes: ${option.votes}`);

            //Mark student as answered
            if (activeStudents[studentId]) {
                activeStudents[studentId].answered = true;

                if (currentPoll && currentPoll.correctOptionId !== undefined && optionId === currentPoll.correctOptionId) {
                    currentPollCorrectAnswers++;
                    console.log(`Student ${studentName} answered correctly! Total correct: ${currentPollCorrectAnswers}`);
                }
            }

            try {
                const optionIndex = currentPoll.options.findIndex(opt => opt.id === optionId);
                if (optionIndex !== -1) {
                    const updatedOptions = [...currentPoll.options];
                    updatedOptions[optionIndex] = { ...option };

                    await pool.query(
                        `UPDATE polls SET options = $1 WHERE id = $2`,
                        [JSON.stringify(updatedOptions), currentPoll.pollId]
                    );
                    console.log(`Poll ${currentPoll.pollId} updated in DB.`);
                }
            } catch (err) {
                console.error('Error updating poll votes in DB:', err);
            }

            broadcastPollState(); 
            updateStudentAnsweredCount(); 
        } else {
            console.log(`Invalid option ID ${optionId} for poll ${pollId}.`);
        }
    });

    //Student answer time up
    socket.on('studentTimeout', (pollId, studentId) => {
        if (currentPoll && currentPoll.pollId === pollId && currentPoll.status === 'active') {
            if (activeStudents[studentId] && !activeStudents[studentId].answered) {
                activeStudents[studentId].answered = true;
                console.log(`Student ${activeStudents[studentId].name} (${studentId}) timed out for poll ${pollId}.`);
                updateStudentAnsweredCount(); 
            }
        }
    });

    //Teacher ends the current poll
    socket.on('endPoll', async (pollId) => {
        if (currentPoll && currentPoll.pollId === pollId && currentPoll.status === 'active') {
            currentPoll.status = 'ended';
            currentPoll.endedAt = Date.now(); 
            currentPoll.correctAnswersCount = currentPollCorrectAnswers;
            console.log(`Poll "${currentPoll.question}" ended. Correct answers: ${currentPoll.correctAnswersCount}`);

            try {
                //Update the poll in the database to 'ended' status, final options, and correct answers count
                await pool.query(
                    `UPDATE polls SET status = $1, ended_at = $2, options = $3, correct_answers_count = $4 WHERE id = $5`,
                    [currentPoll.status, currentPoll.endedAt, JSON.stringify(currentPoll.options), currentPoll.correctAnswersCount, currentPoll.pollId]
                );
                console.log(`Poll ${currentPoll.pollId} status updated to 'ended' in DB with correct answers.`);
            } catch (err) {
                console.error('Error updating poll status in DB:', err);
                socket.emit('error', 'Failed to end poll in database.');
            }

            //Reset
            currentPollCorrectAnswers = 0;

            broadcastPollState();
        } else {
            console.log(`Attempted to end non-existent or inactive poll: ${pollId}`);
        }
    });

    //Client requests current poll state
    socket.on('requestPollState', () => {
        socket.emit('pollStateUpdate', currentPoll);
        updateStudentAnsweredCount();
        if (activeStudents[socket.id] && activeStudents[socket.id].currentPollId === (currentPoll ? currentPoll.pollId : null)) {
            socket.emit('studentHasAnswered', activeStudents[socket.id].answered);
        } else {
             socket.emit('studentHasAnswered', false);
        }
    });

    //Client requests past polls
    socket.on('requestPastPolls', async () => {
        try {
            const res = await pool.query(`
                SELECT id, question, options, status, created_at, ended_at, correct_answers_count -- NEW: Select correct_answers_count
                FROM polls
                WHERE status = 'ended'
                ORDER BY ended_at DESC
                LIMIT 10;
            `);
            const pastPollsFromDB = res.rows.map(row => ({
                pollId: row.id,
                question: row.question,
                options: row.options,
                status: row.status,
                createdAt: parseInt(row.created_at, 10),
                endedAt: parseInt(row.ended_at, 10),
                correctAnswersCount: row.correct_answers_count
            }));
            socket.emit('pastPollsUpdate', pastPollsFromDB);
            console.log(`Sent ${pastPollsFromDB.length} past polls from DB.`);
        } catch (err) {
            console.error('Error fetching past polls from DB:', err);
            socket.emit('error', 'Failed to retrieve past polls.');
        }
    });

    //Teacher wants to kick a student
    socket.on('kickStudent', (studentToKickId) => {
        console.log(`Teacher requested to kick student with ID: ${studentToKickId}`);
        const studentSocket = io.sockets.sockets.get(studentToKickId);

        if (studentSocket) {
            const kickedStudentName = activeStudents[studentToKickId]?.name || 'Unknown Student';
            console.log(`Kicking student: ${kickedStudentName} (${studentToKickId})`);

            studentSocket.emit('kickedOut');

            //Disconnect the student socket
            studentSocket.disconnect(true); 

            if (activeStudents[studentToKickId]) {
                delete activeStudents[studentToKickId];
            }

            io.emit('message', {
                content: `${kickedStudentName} has been removed by the teacher.`,
                type: 'info'
            });

            broadcastActiveStudentsList(); 
            updateStudentAnsweredCount(); 
        } else {
            console.log(`Attempted to kick non-existent or already disconnected student: ${studentToKickId}`);
            socket.emit('error', 'Student not found or already disconnected.');
        }
    });

    //Chat message received
    socket.on('chatMessage', (message) => {
        chatMessages.push(message); 
        broadcastChatMessages(); 
        console.log(`Chat message from ${message.senderName}: ${message.messageText}`);
    });

    //Client requests chat messages
    socket.on('requestChatMessages', () => {
        broadcastChatMessages();
    });

    //User disconnects
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Remove student from active list
        if (activeStudents[socket.id]) {
            const disconnectedStudentName = activeStudents[socket.id].name;
            delete activeStudents[socket.id];
            updateStudentAnsweredCount();
            broadcastActiveStudentsList();
            console.log(`Student ${disconnectedStudentName} (${socket.id}) removed from active list.`);
        }
    });
});

//Testing it
app.get('/', (req, res) => {
    res.send('Polling backend is running!');
});

//Start server
server.listen(PORT, () => {
    console.log(`Polling server listening on port ${PORT}`);
});