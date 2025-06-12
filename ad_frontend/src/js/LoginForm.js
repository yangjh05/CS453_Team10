import React, { useState } from "react";

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      // TODO: Request JWT Login Token
      // const data = await response.json();
      if (/*response.ok*/ true) {
        // localStorage.setItem("token", data.token); // 토큰 저장
        alert("Login successful!");
        onLogin(username);
      } else {
        alert("error");
      }
    } catch (error) {
      console.error("Error logging in:", error);
    }
  }

  return (
    <div>
      <h2>CS453 Automated Testing</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default LoginForm;