import React, { useState, useEffect } from 'react';
import { ref, push, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

const Chat = ({ gameId, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const messagesRef = ref(rtdb, `games/${gameId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.values(data));
      }
    });
    return () => unsubscribe();
  }, [gameId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messagesRef = ref(rtdb, `games/${gameId}/messages`);
      push(messagesRef, {
        text: newMessage,
        sender: user.uid,
        timestamp: Date.now()
      });
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container mt-4">
      <h3 className="font-bold mb-2">Chat</h3>
      <div className="messages-container h-40 overflow-y-auto mb-2">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === user.uid ? 'text-right' : 'text-left'}`}>
            <span className="text-sm text-gray-500">{msg.sender === user.uid ? 'You' : 'Opponent'}:</span>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow px-2 py-1 text-black"
          placeholder="Type a message..."
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1 ml-2">Send</button>
      </form>
    </div>
  );
};

export default Chat;
