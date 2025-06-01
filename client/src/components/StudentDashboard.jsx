import React, { useState, useEffect, useRef, useContext } from 'react';
import AppContext from "../context/AppContext";
import PollResults from './PollResults';

function StudentDashboard() {
    const { socket, studentName, setStudentName, currentPoll, setCurrentPoll, showMessage, setShowMessage, messageContent, messageType } = useContext(AppContext);

    const [selectedOption, setSelectedOption] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const timerRef = useRef(null);
    const [isKickedOut, setIsKickedOut] = useState(false);
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [tempName, setTempName] = useState('');

useEffect(() => {
    let storedName = sessionStorage.getItem('studentName');
    if (!storedName) {
        setShowNamePrompt(true);
    } else {
        setStudentName(storedName);
    }
}, [setStudentName]);

const handleNameContinue = () => {
    if (tempName.trim()) {
        sessionStorage.setItem('studentName', tempName.trim());
        setStudentName(tempName.trim());
        setShowNamePrompt(false);
    }
};


    const hasJoinedRef = useRef(false);
    useEffect(() => {
        if (!studentName) return;
         if (!hasJoinedRef.current) {
        socket.emit('studentConnected', socket.id, studentName);
        hasJoinedRef.current = true;
    }
        socket.emit('studentConnected', socket.id, studentName);

        socket.on('pollStateUpdate', (poll) => {
            console.log("Student: pollStateUpdate received", poll);
            console.log("Student: Previous currentPoll in state:", currentPoll);

            if (poll && poll.status === 'active') {
                if (!currentPoll || currentPoll.pollId !== poll.pollId) {
                    console.log("Student: New poll detected. Resetting answer state.");
                    setHasAnswered(false);
                    setSelectedOption(null); 
                    setShowResults(false);
                }
                setCurrentPoll(poll);

                // Start countdown timer
                const endTime = poll.createdAt + (poll.maxTime * 1000);
                const updateTimer = () => {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
                    setTimeLeft(remaining);

                    if (remaining === 0) {
                        clearInterval(timerRef.current);
                        setShowResults(true);
                        if (!hasAnswered && currentPoll && currentPoll.pollId === poll.pollId) {
                             socket.emit('studentTimeout', poll.pollId, socket.id);
                        }
                    }
                };
                clearInterval(timerRef.current);
                timerRef.current = setInterval(updateTimer, 1000);
                updateTimer(); 
            } else if (poll && poll.status === 'ended') {
                //If poll ended, update and show results
                setCurrentPoll(poll);
                clearInterval(timerRef.current);
                setTimeLeft(0);
                setShowResults(true);
            } else {
                //No active poll, reset all poll-related states
                setCurrentPoll(null);
                clearInterval(timerRef.current);
                setTimeLeft(0);
                setHasAnswered(false);
                setSelectedOption(null);
                setShowResults(false);
            }
        });

        socket.on('studentHasAnswered', (answered) => {
            console.log("Student: server says hasAnswered:", answered);
            setHasAnswered(answered);
            if (answered) {
                setShowResults(true);
            }
        });

        socket.on('kickedOut', () => {
            console.log("Student: You have been kicked out!");
            setIsKickedOut(true); 
            clearInterval(timerRef.current); 
            showMessage('You have been removed from the session.', 'error');
            socket.disconnect();
        });
        socket.emit('requestPollState');

        return () => {
            socket.off('pollStateUpdate');
            socket.off('studentHasAnswered');
            socket.off('kickedOut');
            clearInterval(timerRef.current);
        };
    }, [socket, studentName, setCurrentPoll, showMessage, currentPoll, hasAnswered]);

    const handleSubmitAnswer = () => {
        console.log("Submit button clicked. Current selectedOption:", selectedOption);
        console.log("Debug: hasAnswered =", hasAnswered);
        console.log("Debug: currentPoll.status =", currentPoll?.status);
        console.log("Debug: timeLeft =", timeLeft);

        if (selectedOption === null) {
            showMessage('Please select an option.', 'error');
            return;
        }
        if (isKickedOut) {
            showMessage('You cannot submit. You have been removed from the session.', 'error');
            return;
        }
        if (currentPoll && !hasAnswered && currentPoll.status === 'active' && timeLeft > 0) {
            socket.emit('submitVote', {
                pollId: currentPoll.pollId,
                optionId: selectedOption,
                studentId: socket.id,
                studentName: studentName,
            });
            setHasAnswered(true);
            setShowResults(true);
            clearInterval(timerRef.current);
            showMessage('Answer submitted!', 'success');
        } else {
            if (hasAnswered) {
                showMessage('You have already answered this poll.', 'warning');
            } else if (!currentPoll || currentPoll.status !== 'active') {
                showMessage('No active poll or poll has ended.', 'warning');
            } else if (timeLeft <= 0) {
                showMessage('Time for this poll has expired. Cannot submit.', 'warning');
            } else {
                showMessage('Cannot submit answer due to an unknown state error.', 'error');
            }
        }
    };
    
    if (showNamePrompt) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <div className="max-w-lg w-full mx-auto text-center">
                <h2 className="text-3xl font-semibold mb-2">
                    Let’s <span className="font-bold">Get Started</span>
                </h2>
                <p className="text-gray-600 mb-8">
                    If you’re a student, you’ll be able to <b>submit your answers</b>, participate in live polls, and see how your responses compare with your classmates
                </p>
                <div className="text-left mb-6">
                    <label className="block mb-2 font-medium" htmlFor="studentNameInput">Enter your Name</label>
                    <input
                        id="studentNameInput"
                        type="text"
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        className="w-full px-4 py-3 rounded-md bg-gray-100 border-none text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder="Your Name"
                    />
                </div>
                <button
                    className={`w-52 py-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 text-white font-semibold text-lg transition-all duration-200
                        ${!tempName.trim() ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    onClick={handleNameContinue}
                    disabled={!tempName.trim()}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

if (isKickedOut) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white font-inter">
      <button
        className="mb-8 px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-base flex items-center gap-2 shadow"
        onClick={() => window.location.reload()} // or your own handler
      >
        <span className="mr-1">✨</span>
        Poll
      </button>
      <h2 className="text-3xl font-bold text-black mb-3">You’ve been Kicked out !</h2>
      <p className="text-lg text-gray-400 text-center max-w-md">
        Looks like the teacher had removed you from the poll system. Please<br />Try again sometime.
      </p>
    </div>
  );
}

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-inter">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Student Dashboard - Welcome, {studentName}!</h2>

            {showMessage && (
                <div className={`mb-4 p-4 rounded-md text-white ${messageType === 'error' ? 'bg-red-500' : messageType === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {messageContent}
                    <button onClick={() => setShowMessage(false)} className="float-right font-bold">X</button>
                </div>
            )}

            {currentPoll && currentPoll.question && currentPoll.status === 'active' && !hasAnswered && timeLeft > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">{currentPoll.question}</h3>
                    <p className="text-lg text-red-600 mb-4 font-semibold">Time left: {timeLeft} seconds</p>
                    <div className="flex flex-col space-y-3 mb-6">
                        {currentPoll.options.map((option) => (
                            <label key={option.id} className="inline-flex items-center cursor-pointer p-2 rounded-md hover:bg-blue-50 transition duration-200">
                                <input
                                    type="radio"
                                    className="form-radio h-5 w-5 text-blue-600 rounded-full"
                                    name="pollOption"
                                    value={option.id}
                                    checked={selectedOption === option.id}
                                    onChange={() => {
                                        setSelectedOption(option.id);
                                    }}
                                />
                                <span className="ml-3 text-lg text-gray-700">{option.text}</span>
                            </label>
                        ))}
                    </div>
<button
    onClick={handleSubmitAnswer}
    disabled={hasAnswered || timeLeft <= 0}
    className={`${
        hasAnswered || timeLeft <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
    } text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-300 ease-in-out`}
>
    {hasAnswered ? 'Answer Submitted' : 'Submit Answer'}
</button>

{hasAnswered && (
    <p className="mt-3 text-green-700 font-semibold">
        You have submitted your answer.
    </p>
)}



                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    {showResults || (currentPoll && currentPoll.status === 'ended') || hasAnswered ? (
                        <>
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Poll Results</h3>
                            {currentPoll && currentPoll.question ? (
                                <PollResults poll={currentPoll} status={currentPoll.status} />
                            ) : (
                                <p className="text-gray-600">No poll results to display.</p>
                            )}
                        </>
                    ) : (
                        <p className="text-lg text-gray-600">Waiting for the teacher to ask a question...</p>
                    )}
                </div>
            )}
        </div>
    );
}


export default StudentDashboard;
