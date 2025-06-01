import React, { useState, useMemo, useEffect } from "react";
import { io } from "socket.io-client";
import AppContext from "./context/AppContext";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import ChatPopup from "./components/ChatPopup";


function App() {
  const [userType, setUserType] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [currentPoll, setCurrentPoll] = useState(null);
  const [pastPolls, setPastPolls] = useState([]);
  const [activeStudentsList, setActiveStudentsList] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageType, setMessageType] = useState("info");

  const displayMessage = (content, type = "info") => {
    setMessageContent(content);
    setMessageType(type);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 5000);
  };

  const socket = useMemo(() => io("http://localhost:5000"), []);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      displayMessage("Disconnected from polling server.", "warning");
    });
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      displayMessage("Failed to connect to polling server. Retrying...", "error");
      setTimeout(() => socket.connect(), 5000);
    });
    socket.on("currentPollState", (poll) => setCurrentPoll(poll));
    socket.on("activeStudentsList", (list) => setActiveStudentsList(list));
    socket.on("message", (msg) => displayMessage(msg.content, msg.type));
    if (socket.connected) socket.emit("requestPollState");
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("currentPollState");
      socket.off("activeStudentsList");
      socket.off("message");
    };
  }, [socket]);

  if (!userType) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-inter px-4">
        <div className="mb-8">
          <div className="w-28 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg mx-auto">
            <span className="text-white text-xl">✨</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold text-center mb-3">
          Welcome to the <span className="font-black">Live Polling System</span>
        </h1>
        <p className="text-gray-500 text-lg text-center mb-8 max-w-lg">
          Please select the role that best describes you to begin using the live polling system
        </p>
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          {/* Student card */}
          <button
            type="button"
            onClick={() => setSelectedRole("student")}
            className={`
              flex-1 max-w-xs p-6 rounded-xl border-2 transition
              text-left bg-white
              ${
                selectedRole === "student"
                  ? "border-blue-500 shadow-lg"
                  : "border-gray-200 hover:border-blue-400"
              }
              focus:outline-none
            `}
            style={{ minWidth: "270px" }}
          >
            <div className="font-bold text-lg mb-1">I’m a Student</div>
            <div className="text-gray-500 text-sm">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry
            </div>
          </button>
          {/* Teacher card */}
          <button
            type="button"
            onClick={() => setSelectedRole("teacher")}
            className={`
              flex-1 max-w-xs p-6 rounded-xl border-2 transition
              text-left bg-white
              ${
                selectedRole === "teacher"
                  ? "border-blue-500 shadow-lg"
                  : "border-gray-200 hover:border-blue-400"
              }
              focus:outline-none
            `}
            style={{ minWidth: "270px" }}
          >
            <div className="font-bold text-lg mb-1">I’m a Teacher</div>
            <div className="text-gray-500 text-sm">
              Submit answers and view live poll results in real-time.
            </div>
          </button>
        </div>
        {/* Continue button */}
        <button
          type="button"
          className={`
            w-60 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-semibold
            shadow-md transition hover:opacity-90 focus:outline-none
            ${selectedRole ? "" : "opacity-50 cursor-not-allowed"}
          `}
          disabled={!selectedRole}
          onClick={() => setUserType(selectedRole)}
        >
          Continue
        </button>
      </div>
    );
  }

  //Show Dashboards after selection
  return (
    <AppContext.Provider
      value={{
        socket,
        studentName,
        setStudentName,
        userType,
        currentPoll,
        setCurrentPoll,
        pastPolls,
        setPastPolls,
        activeStudentsList,
        showMessage: displayMessage,
        messageContent,
        messageType,
        setShowMessage,
      }}
    >
      <div className="relative">
        {userType === "teacher" ? (
          <TeacherDashboard />
        ) : userType === "student" ? (
          <StudentDashboard />
        ) : null}
        <ChatPopup />
      </div>
    </AppContext.Provider>
  );
}


export default App;

