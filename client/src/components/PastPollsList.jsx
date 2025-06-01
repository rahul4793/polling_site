import React, { useState, useEffect, useContext } from 'react';
import AppContext from '../context/AppContext';
import PollResults from './PollResults';

function PastPollsList() {
    const { pastPolls, setPastPolls, socket } = useContext(AppContext);
    const [selectedPastPoll, setSelectedPastPoll] = useState(null);

    //useEffect to fetch past polls from the server
    useEffect(() => {
        socket.on('pastPollsUpdate', (polls) => {
            console.log("Past polls update received:", polls);
            setPastPolls(polls);
        });

        socket.emit('requestPastPolls');

        return () => {
            socket.off('pastPollsUpdate');
        };
    }, [socket, setPastPolls]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Past Poll Results</h3>
            {pastPolls.length > 0 ? (
                <ul className="list-disc pl-5">
                    {pastPolls.map(poll => (
                        <li key={poll.pollId} className="mb-2">
                            <button
                                onClick={() => setSelectedPastPoll(poll)}
                                className="text-blue-600 hover:underline font-medium"
                            >
                                {poll.question} (Ended: {new Date(poll.endedAt).toLocaleString()})
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-600">No past polls available.</p>
            )}

            {selectedPastPoll && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full relative">
                        <button
                            onClick={() => setSelectedPastPoll(null)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                        >
                            &times;
                        </button>
                        <h4 className="text-2xl font-bold text-gray-800 mb-4">Past Poll: {selectedPastPoll.question}</h4>
                        <PollResults poll={selectedPastPoll} status={selectedPastPoll.status} />
                    </div>
                </div>
            )}
        </div>
    );
}


export default PastPollsList;
