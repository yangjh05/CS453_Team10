import React, { useState } from "react";
import "../css/SearchBar.css";

function SearchBar({ username, onSearch, isSearched, domains, fetchData }) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSearchClick = (value) => {
    onSearch(value); // 입력값을 상위 컴포넌트에 전달
  };

  const handleAddDomain = () => {
    // 프롬프트로 도메인 이름을 입력 받음
    const domain = prompt('Enter domain name:');
    
    if (!domain) {
      alert('Please enter a domain name');
      return;
    }

    // API 요청을 위한 fetch
    fetch('http://localhost:5000/api/new_domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: domain }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(data.error)
        } else {
          alert(data.message)
          fetchData();
        }
      })
      .catch((err) => {
        alert(err)
      });
  };

  return (
    <div className="search-bar">
      <div className={`search-bar-input`}>
        <input
          type="text"
          placeholder="Search..."
          value={inputValue}
          onChange={handleInputChange}
        />
        <button onClick={() => handleSearchClick(inputValue)}>Search</button>
      </div>
      <div className="domain-list">
        <ul>
          {domains.map((key) => (
            <li key={key} onClick={() => handleSearchClick(key)}>
              {key}
            </li>
          ))}
        </ul>
      </div>
      <div className="solo-button-container">
        <button className="add-domain" onClick={handleAddDomain}>Add a Domain</button>
      </div>
    </div>
  );
}

export default SearchBar;
