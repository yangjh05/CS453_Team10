import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, MoreVertical } from 'lucide-react';
import '../css/SpotlightSearch.css';

const SearchOverlay = ({domains, fetchData, onSearch}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'search' or 'add'
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sample data - replace with your actual data
  const savedItems = domains;

  useEffect(() => {
		setSuggestions(savedItems);
		
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (searchTerm && mode === 'search') {
      const filtered = savedItems.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(savedItems);
    }
  }, [searchTerm]);

  const handleClose = () => {
    setIsOpen(false);
    setMode(null);
    setSearchTerm('');
    setNewItem('');
    setSuggestions(savedItems);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (newItem.trim()) {
      fetch('http://localhost:5000/api/new_domain', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ domain: newItem }),
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
      console.log('Added new item:', newItem);
      setNewItem('');
    }
  };

  return (
    <div className="search-overlay-container">
      {!isOpen && (
        <button 
          className="floating-button"
          onClick={() => setIsOpen(true)}
        >
          <MoreVertical color="white" size={24} />
        </button>
      )}

      {isOpen && (
        <div className="overlay">
          <div ref={containerRef} className="container">
            <div className="action-buttons">
              <button 
                className={`action-button ${mode === 'search' ? 'active' : ''}`}
                onClick={() => setMode('search')}
              >
                <Search size={20} />
                Search
              </button>
              <button 
                className={`action-button ${mode === 'add' ? 'active' : ''}`}
                onClick={() => setMode('add')}
              >
                <Plus size={20} />
                Add
              </button>
            </div>

            {mode && (
              <div className="input-container">
                <div className="input-wrapper">
                  {mode === 'search' ? (
                    <>
                      <Search className="icon" size={20} />
                      <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
												onKeyDown={(e) => {
													if(e.key == "Enter" && savedItems.includes(searchTerm)){
														onSearch(searchTerm);
														handleClose();
													}
												}}
                        placeholder="Search anything..."
                        className="input"
                      />
                    </>
                  ) : (
                    <form onSubmit={handleAdd} style={{ display: 'flex', flex: 1 }}>
                      <Plus className="icon" size={30} />
                      <input
                        ref={inputRef}
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Add new item..."
                        className="input"
                      />
                      <button type="submit" className="enter-button">
                        Enter
                      </button>
                    </form>
                  )}
                  <button
                    className="close-button"
                    onClick={handleClose}
                  >
                    <X size={20} className="icon" />
                  </button>
                </div>

                {mode === 'search' && suggestions.length > 0 && (
                  <div className="suggestions-container">
                    {suggestions.map((item, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => {
                          setSearchTerm(item);
                          onSearch(item);
													handleClose();
                        }}
                      >
                        <Search size={16} className="suggestion-icon" />
                        <span className="suggestion-text">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchOverlay;