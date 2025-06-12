import React, { useState, useEffect } from "react";
import SearchBar from "./js/SearchBar";
import ContentArea from "./js/ContentArea";
import "./App.css";
import "./css/default.css"
import LoginForm from "./js/LoginForm";
import EvidenceCollection from "./js/EvidenceCollection";
import SpotlightSearch from "./js/SpotlightSearch";

function App() {
  const [isSearched, setIsSearched] = useState(false);
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState([]);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    const url = "http://localhost:5000/api/domain_info";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        setDomains(responseData.domains);
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (inputValue) => {
    if (domains.includes(inputValue)) {
      setDomain(inputValue);
      setIsSearched(true);
      console.log(true);
    } else {
      alert("No matching domain found");
    }
  };

  const handleLogin = (id) => {
    setUsername(id);
    setStep((prevStep) => prevStep + 1);
  };

  const handleMenuClick = (id) => {
    if (selected !== id) setSelected(id);
  };

  const menuItems = [
    // { id: 1, label: "공지", link: "#home" },
    { id: 1, label: "Testing", link: "#download" },
    { id: 2, label: "Edit", link: "#edit" },
  ];

  return (
    <div className="App">
      {step !== 1 && <SpotlightSearch domains={domains} fetchData={fetchData} onSearch={handleSearch}/>}
      {step === 1 && <LoginForm onLogin={handleLogin}></LoginForm>}
      {step === 2 && (
        <div className="full-container">
          <nav className="navbar">
            <div className="logo">
              <p>CS453</p>
            </div>
            <ul className="navbar-menu">
              {menuItems.map((item) => (
                <li
                  key={item.id}
                  className={
                    "navber-item " + (selected == item.id ? "navbar-selected" : "")
                  }
                >
                  <a
                    href={item.link}
                    className={
                      "navbar-link " + (selected == item.id ? "navbar-selected" : "")
                    }
                    onClick={(e) => {
                      e.preventDefault(); // 기본 링크 동작 방지
                      handleMenuClick(item.id); // 메뉴 클릭 시 selected 상태 업데이트
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="user-info">
              <p>{username}</p>
            </div>
          </nav>
          {selected === 1 && (
            <div className="MainContent">
              {isSearched && <EvidenceCollection domain={domain}></EvidenceCollection>}
            </div>
          )}
          {selected === 2 && (
            <div className="MainContent">
              {isSearched && <ContentArea key={domain} domain={domain} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
