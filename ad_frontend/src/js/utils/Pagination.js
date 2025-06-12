import React from "react";
import "../../css/Pagination.css"

const Pagination = ({ totalPages, currentPage, onPageChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  return (
    <div className="pagination">
      <button
        className="pagination-button"
        disabled={currentPage === 1}
        onClick={handlePrevious}
      >
        &lt;
      </button>
      {[...Array(totalPages)].map((_, index) => (
        <button
          key={index + 1}
          className={`pagination-button ${
            currentPage === index + 1 ? "active" : ""
          }`}
          onClick={() => handlePageClick(index + 1)}
        >
          {index + 1}
        </button>
      ))}
      <button
        className="pagination-button"
        disabled={currentPage === totalPages}
        onClick={handleNext}
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
