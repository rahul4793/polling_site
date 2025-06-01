import React, { useState, useEffect, useMemo, useContext } from "react";
import AppContext from "../context/AppContext";
import PollResults from "./PollResults";
import PastPollsList from "./PastPollsList";

function TeacherDashboard() {
    const { socket, currentPoll, setCurrentPoll, setPastPolls, showMessage, setShowMessage, messageContent, messageType } = useContext(AppContext);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']); 
    const [maxTime, setMaxTime] = useState(60); 
    const [correctOptionId, setCorrectOptionId] = useState(null);
    const [isPollActive, setIsPollActive] = useState(false);
    const [pollResults, setPollResults] = useState({});
    const [studentsAnswered, setStudentsAnswered] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);

    // useEffect to listen for poll updates
    useEffect(() => {
        socket.on('pollStateUpdate', (poll) => {
            console.log("Teacher: pollStateUpdate received", poll);
            if (poll && poll.status === 'active') {
                setCurrentPoll(poll);
                setIsPollActive(true);
                setQuestion(poll.question);
                // When updating form options, only set options that actually exist in the poll
                setOptions(poll.options.map(opt => opt.text));
                setPollResults(poll.options.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.votes }), {}));
                setStudentsAnswered(poll.studentsAnswered || 0);
                setTotalStudents(poll.totalStudents || 0);
            } else if (poll && poll.status === 'ended') {
                setCurrentPoll(poll);
                setIsPollActive(false);
                setPollResults(poll.options.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.votes }), {}));
                setStudentsAnswered(poll.studentsAnswered || 0);
                setTotalStudents(poll.totalStudents || 0);
            } else {
                // No active poll reset state
                setCurrentPoll(null);
                setIsPollActive(false);
                setQuestion('');
                setOptions(['', '']);
                setPollResults({});
                setStudentsAnswered(0);
                setTotalStudents(0);
                setCorrectOptionId(null);
            }
        });
        socket.on('studentAnsweredCount', ({ answered, total }) => {
            setStudentsAnswered(answered);
            setTotalStudents(total);
        });
        socket.emit('requestPollState');
        return () => {
            socket.off('pollStateUpdate');
            socket.off('studentAnsweredCount');
        };
    }, [socket, setCurrentPoll]);

    // Determine if a new question can be asked based on current poll status
    const canAskNewQuestion = useMemo(() => {
        if (!currentPoll) {
            return true;
        }
        if (currentPoll.status === 'ended') {
            return true;
        }
        return isPollActive && totalStudents > 0 && studentsAnswered === totalStudents;
    }, [currentPoll, isPollActive, studentsAnswered, totalStudents]);


    // Handler for updating poll options in the form
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
        if (correctOptionId === index && value.trim() === '') {
            setCorrectOptionId(null);
        }
    };

    // Handler for removing an option field
    const handleRemoveOption = (indexToRemove) => {
        const newOptions = options.filter((_, index) => index !== indexToRemove);
        setOptions(newOptions);
        if (correctOptionId === indexToRemove) {
            setCorrectOptionId(null);
        } else if (correctOptionId !== null && correctOptionId > indexToRemove) {
            setCorrectOptionId(correctOptionId - 1);
        }
    };

    const handleCorrectOptionChange = (optionIndex) => {
        setCorrectOptionId(optionIndex);
    };

    const handleCreatePoll = async () => {
        if (!question.trim()) {
            showMessage('Please enter a question.', 'error');
            return;
        }
        const filteredOptions = options.filter(opt => opt.trim() !== '');
        if (filteredOptions.length < 2) {
            showMessage('Please provide at least two options.', 'error');
            return;
        }
        if (correctOptionId === null || correctOptionId >= filteredOptions.length || filteredOptions[correctOptionId].trim() === '') {
            showMessage('Please select a valid correct answer for the poll.', 'error');
            return;
        }

        const pollOptionsWithIds = filteredOptions.map((text, id) => ({ id, text: text.trim(), votes: 0 }));

        const newPoll = {
            question: question.trim(),
            options: pollOptionsWithIds,
            correctOptionId: pollOptionsWithIds[correctOptionId].id, // Use the actual ID from the mapped options
            maxTime: parseInt(maxTime, 10) || 60,
        };

        socket.emit('createPoll', newPoll);
        console.log("Polingggggggggggggggggggg")
        showMessage('Poll created successfully!', 'success');
    };

    const handleEndPoll = () => {
        if (currentPoll && currentPoll.status === 'active') {
            socket.emit('endPoll', currentPoll.pollId);
            showMessage('Poll ended.', 'info');
        } else {
            showMessage('No active poll to end.', 'warning');
        }
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-inter">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Teacher Dashboard</h2>

            {showMessage && (
                <div className={`mb-4 p-4 rounded-md text-white ${messageType === 'error' ? 'bg-red-500' : messageType === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {messageContent}
                    <button onClick={() => setShowMessage(false)} className="float-right font-bold">X</button>
                </div>
            )}
            <div className="w-full bg-white p-8 rounded-xl shadow border border-gray-100 mt-6 mb-12">

    <div className="flex justify-center mb-4">
        <div className="w-28 h-7 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
            <span className="mr-2">✨</span>
        </div>
    </div>
    <h2 className="text-3xl font-semibold mb-2 text-center">
        Let’s <span className="font-bold">Get Started</span>
    </h2>
    <p className="text-gray-500 mb-8 text-center">
        you’ll have the ability to create and manage polls, ask questions, and monitor your students’ responses in real-time.
    </p>
    <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
            <label className="block mb-1 font-medium text-gray-700" htmlFor="poll-question">Enter your question</label>
            <textarea
                id="poll-question"
                className="w-full h-20 px-4 py-3 rounded-md bg-gray-100 border-none text-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                maxLength={100}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Type your question..."
                disabled={isPollActive && !canAskNewQuestion}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
                {question.length}/100
            </div>
        </div>
        <div>
            <label className="block mb-1 font-medium text-gray-700" style={{ visibility: "hidden" }}>Timer</label>
            <select
                id="poll-timer"
                className="py-2 px-4 rounded-md bg-gray-100 border-none text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={maxTime}
                onChange={e => setMaxTime(Number(e.target.value))}
                disabled={isPollActive && !canAskNewQuestion}
            >
                {[30, 45, 60, 90, 120].map(time => (
                    <option key={time} value={time}>{time} seconds</option>
                ))}
            </select>
        </div>
    </div>
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-700">Edit Options</span>
            <span className="ml-auto font-medium text-gray-700">Is it Correct?</span>
        </div>
        {options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 flex-1">
                    <span className="bg-gray-100 w-7 h-7 rounded-full flex items-center justify-center font-bold text-purple-500">{idx + 1}</span>
                    <input
                        type="text"
                        className="flex-1 px-4 py-2 rounded-md bg-gray-100 border-none text-base focus:outline-none focus:ring-2 focus:ring-purple-400"
                        value={option}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        maxLength={40}
                        disabled={isPollActive && !canAskNewQuestion}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name={`correctOption`}
                            checked={correctOptionId === idx}
                            onChange={() => setCorrectOptionId(idx)}
                            className="accent-purple-500 w-4 h-4"
                            disabled={isPollActive && !canAskNewQuestion}
                        />
                        <span className="ml-2">Yes</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name={`correctOptionNo-${idx}`}
                            checked={correctOptionId !== idx}
                            onChange={() => setCorrectOptionId(null)}
                            className="accent-gray-400 w-4 h-4"
                            disabled={isPollActive && !canAskNewQuestion}
                        />
                        <span className="ml-2">No</span>
                    </label>
                </div>
                {options.length > 2 && (
                    <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="ml-2 text-red-500 hover:text-red-700 text-lg font-bold"
                        disabled={isPollActive && !canAskNewQuestion}
                    >
                        &times;
                    </button>
                )}
            </div>
        ))}
        <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            className="mt-2 text-purple-600 border border-purple-200 hover:bg-purple-50 hover:border-purple-400 font-semibold text-sm rounded px-4 py-2 transition-all"
            disabled={options.length >= 6 || (isPollActive && !canAskNewQuestion)}
        >
            + Add More option
        </button>
    </div>
    <div className="flex gap-4 justify-end pt-3">
        <button
            onClick={handleCreatePoll}
            className="w-52 py-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 text-white font-semibold text-lg transition-all duration-200 shadow-sm hover:opacity-90"
            disabled={isPollActive && !canAskNewQuestion}
        >
            Ask Question
        </button>

            <button
    onClick={handleEndPoll}
    className={`w-32 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold text-lg transition-all duration-200 shadow-sm hover:opacity-90 ${
        !isPollActive ? 'opacity-50 cursor-not-allowed' : ''
    }`}
    disabled={!isPollActive}
>
    End
</button>

    </div>
    {isPollActive && (
        <p className="mt-4 text-gray-600">
            Students answered: {studentsAnswered} / {totalStudents}
        </p>
    )}
    {currentPoll && currentPoll.status === 'ended' && currentPoll.correctAnswersCount !== undefined && (
        <p className="mt-4 text-green-700 font-semibold">
            Correct Answers: {currentPoll.correctAnswersCount} / {totalStudents}
        </p>
    )}
    </div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Live Poll Results</h3>
                {currentPoll && currentPoll.question ? (
                    <PollResults poll={currentPoll} status={currentPoll.status} />
                ) : (
                    <p className="text-gray-600">No active poll results to display.</p>
                )}
            </div>
            <PastPollsList />
        </div>
    );
}
export default TeacherDashboard;
