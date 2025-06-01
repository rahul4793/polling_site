# Live Interactive Polling & Quiz System

A real-time web application designed to facilitate interactive polling and quizzing sessions between teachers and students. Teachers can create questions, define correct answers, manage active polls, and view live results, while students can join, submit answers, and participate in real-time chat.

## Features

This system offers a dynamic and engaging experience for both educators and learners:

### Teacher Features:
* **Create & Manage Polls:** Easily create new questions with multiple-choice options.
* **Define Correct Answers:** Mark a specific option as the correct answer for quiz-like questions.
* **Real-time Results:** View live updates of student responses as they come in, presented with a clear bar chart.
* **Session Management:** Explicitly end the current question sequence at any time.
* **Past Sessions Review:** Access a historical list of all conducted polls and question sequences with their final results.
* **Live Student List:** See all currently connected students.
* **Student Kicking:** Ability to remove disruptive students from the session.
* **Teacher-Student Chat:** Real-time messaging with all connected students.

### Student Features:
* **Join Session by Name:** Students provide their name to join the interactive session.
* **Single Submission:** Students can only submit one answer per question.
* **Countdown Timer:** A clear timer indicates how much time is left to answer the current question.
* **Real-time Participation:** Submit votes and see whether their answer was recorded.
* **Chat with Teacher/Peers:** Participate in the live chat.
* **"Kicked Out" Notification:** Receive immediate feedback if removed by the teacher.

## Technologies Used

* **Frontend:**
    * React.js
    * Tailwind CSS
    * mui/x-charts
* **Backend:**
    * Node.js
    * Express.js
    * Socket.IO

## Installation & Setup

Follow these steps to get the project up and running on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
2.  **Create a env file in server**
    ```bash
    PG_USER=postgres
    PG_HOST=localhost
    PG_DATABASE=
    PG_PASSWORD=
    PG_PORT=5432

    ```

3.  **Backend Setup:**
    Navigate to the `server` directory
    ```bash
    cd server
    npm install
    ```
    *Note: The PostgresSQL database table polls will be created.*

4.  **Frontend Setup:**
    Navigate to the `client` directory.
    ```bash
    cd client
    npm install
    ```

## Running the Application

1.  **Start the Backend Server:**
    Open a gitbash terminal in server directory:
    ```bash
    node server.js
    ```
2.  **Start the Frontend Development Server:**
    Open a gitbash terminal in client directory:
    ```bash
    npm run dev
    ```
    
## How to use

* Open `http://localhost:<PG_PORT>` in your web browser.
* **For Teacher:** Click "I am a Teacher".
* **For Student:** Open another tab or browser window and navigate to `http://localhost:<PG_PORT>`. Click "I am a Student" and enter your name.
* You can open multiple student tabs/windows to simulate multiple participants.

## Screenshots

Here are a few glimpses of the application:

* **Hoem Dashboard:**
![image](https://github.com/user-attachments/assets/de735edf-22cf-4121-8001-bdd4700f603f)


* **Teacher Dashboard:**
![image](https://github.com/user-attachments/assets/86ab6264-b53a-43de-9b3d-d2b4dfa63b8e)


* **Student Dashboard (Active Poll):**
![image](https://github.com/user-attachments/assets/bfcf6a3c-6861-4bdd-9d50-39e6def58c17)

![image](https://github.com/user-attachments/assets/aa83b8e1-bb60-44a0-86d9-72b6194ffb74)



* **Poll Results (Teacher View):**
![image](https://github.com/user-attachments/assets/f678b8cf-dc39-46be-8295-26ba6155bf44)

![image](https://github.com/user-attachments/assets/586f7b49-2d05-40e7-8667-c245dd14a821)


* **Chat and kickout feature:**
  
![image](https://github.com/user-attachments/assets/7f68f87a-499e-40de-95ad-55a91d7f47f8)

![image](https://github.com/user-attachments/assets/9751ab20-881e-4bb1-9858-a7b23dc3099f)






