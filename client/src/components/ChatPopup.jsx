import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { FiMessageSquare } from "react-icons/fi";
import AppContext from "../context/AppContext";

function ChatPopup() {
    const { socket, userType, studentName, currentPoll, showMessage, activeStudentsList } = useContext(AppContext);
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const messagesEndRef = useRef(null);

    //a simple unique ID
    const sessionId = useMemo(() => sessionStorage.getItem('sessionId') || `user-${Math.random().toString(36).substring(2, 9)}`, []);
    useEffect(() => {
        sessionStorage.setItem('sessionId', sessionId);
    }, [sessionId]);


    //Determine sender name based on user type
    const senderName = userType === 'teacher' ? 'Teacher' : studentName || `Student-${sessionId.substring(0, 4)}`;


    //useEffect to listen for chat messages from the server
    useEffect(() => {
        socket.on('chatMessagesUpdate', (messages) => {
            setChatMessages(messages);
        });
        socket.emit('requestChatMessages');
        return () => {
            socket.off('chatMessagesUpdate');
        };
    }, [socket]);

    // useEffect to scroll to the bottom of the chat messages when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Handler for sending a chat message
    const handleSendMessage = () => {
        if (!message.trim()) {
            showMessage('Message cannot be empty.', 'error');
            return;
        }

        const newMessage = {
            senderId: sessionId,
            senderName: senderName,
            messageText: message.trim(),
            timestamp: Date.now(),
            pollId: currentPoll ? currentPoll.pollId : null,
        };

        socket.emit('chatMessage', newMessage);
        setMessage('');
    };

    // Handler for kicking a student
    const handleKickStudent = (studentId, studentName) => {
        if (window.confirm(`Are you sure you want to kick ${studentName}?`)) {
            socket.emit('kickStudent', studentId);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-300 ease-in-out flex items-center justify-center"
            aria-label={isOpen ? "Close Chat" : "Open Chat"}>
                <FiMessageSquare size={28} />
                </button>


            {/* Chat popup content */}
            {isOpen && (
                <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col mt-4 border border-gray-200">
                    <div className="p-4 border-b bg-purple-500 text-white rounded-t-lg flex justify-between items-center">
                        <h5 className="font-bold">Live Chat</h5>
                        {userType === 'teacher' && (
                            <span className="text-sm font-semibold">
                                Students: {activeStudentsList.length}
                            </span>
                        )}
                    </div>
                    {/* NEW: Participant list for Teacher */}
                    {userType === 'teacher' && (
                        <div className="p-2 border-b bg-gray-50 max-h-24 overflow-y-auto custom-scrollbar">
                            <h6 className="text-sm font-semibold text-gray-700 mb-1">Participants:</h6>
                            {activeStudentsList.length > 0 ? (
                                <ul>
                                    {activeStudentsList.map(student => (
                                        <li key={student.id} className="flex items-center justify-between text-sm py-1">
                                            <span>{student.name}</span>
                                            {/* Prevent kicking self (teacher's own socket.id) */}
                                            {socket.id !== student.id && (
                                                <button
                                                    onClick={() => handleKickStudent(student.id, student.name)}
                                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-md ml-2"
                                                >
                                                    Kick
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-500">No students connected.</p>
                            )}
                        </div>
                    )}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        {chatMessages.length === 0 ? (
                            <p className="text-gray-500 text-center">No messages yet.</p>
                        ) : (
                            chatMessages.map((msg, index) => (
                                <div key={msg.timestamp + msg.senderId + index} className={`mb-2 ${msg.senderId === sessionId ? 'text-right' : 'text-left'}`}>
                                    <span className={`inline-block px-3 py-1 rounded-lg ${msg.senderId === sessionId ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                        <strong className="text-sm">{msg.senderName}:</strong> {msg.messageText}
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t flex">
                        <input
                            type="text"
                            className="flex-1 border rounded-l-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


export default ChatPopup;
