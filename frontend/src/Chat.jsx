import React, { useState, useEffect, useRef } from 'react';
import { ref, push, onValue } from 'firebase/database';
import { rtdb } from './firebase';

const Chat = ({ gameId, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const chatRef = ref(rtdb, `chats/${gameId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.values(data));
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const chatRef = ref(rtdb, `chats/${gameId}`);
    push(chatRef, {
      text: newMessage,
      userId: user.uid,
      userName: user.displayName || 'Guest',
      timestamp: Date.now(),
    });

    setNewMessage('');
  };

  return (
    <div className="chat-container bg-gray-800 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-2">Chat</h3>
      <div className="messages-container h-48 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.userId === user.uid ? 'text-right' : 'text-left'}`}>
            <span className="font-bold">{msg.userName}: </span>
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-gray-700 text-white p-2 rounded-l"
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
