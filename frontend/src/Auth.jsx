import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { toast } from 'react-toastify';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
    } catch (error) {
      toast.error(`Sign in error: ${error.message}`);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error(`Sign up error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.info('Signed out successfully!');
    } catch (error) {
      toast.error(`Sign out error: ${error.message}`);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth);
      toast.success('Signed in as guest!');
    } catch (error) {
      toast.error(`Guest sign in error: ${error.message}`);
    }
  };

  return (
    <div>
      {auth.currentUser ? (
        <div>
          <p>Signed in as: {auth.currentUser.email || 'Guest'}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <form>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={handleSignIn}>Sign In</button>
          <button onClick={handleSignUp}>Sign Up</button>
          <button onClick={handleGuestSignIn}>Play as Guest</button>
        </form>
      )}
    </div>
  );
};

export default Auth;
