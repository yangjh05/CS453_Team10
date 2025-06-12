import { useEffect, useState, useRef } from "react";
import React from "react";
import "../css/EvidenceCollection.css"
import Pusher from 'pusher-js';
import axios from 'axios';

const pusher = new Pusher('d71846cc46bfa9b2ccc2', {
  cluster: 'ap3',
  encrypted: true,
});

function EvidenceCollection({ domain }) {
	const [progressData, setProgressData] = useState([]);
	const newSign = useRef(true);
  const [state, setState] = useState("");

	const startProgress = async () => {
    const url = "http://localhost:5000/api/download";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Response Data:", responseData);
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const stopProgress = async () => {
    const url = "http://localhost:5000/api/stop_download";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Response Data:", responseData);
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getStatus = async () => {
    const url = "http://localhost:5000/task-status";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain }),
      });

      if (response.ok) {
        const responseData = await response.json();
        switch(true){
          case responseData.status === "SUCCESS":
            setState("Sucess")
            break;
          case responseData.status === "FAILURE":
            setState("Failure")
            break;
          case responseData.status === "RUNNING":
            setState("Running")
            break;
          case responseData.status === "PENDING":
            setState("Pending")
            break;
          case responseData.status === "REVOKED":
            setState("Revoked")
            break;
          case responseData.status.startsWith("DOWNLOAD_"):
            setState(responseData.status.slice("DOWNLOAD_".length) + "번째 채증 중")
            break;

          case responseData.status.startsWith("AIANYZ_"):
            setState(responseData.status.slice("AIANYZ_".length) + "번째 분석 중")
            break;

          case responseData.status.startsWith("FTPW_"):
            setState(responseData.status.slice("FTPW_".length) + "번째 FTP 전송 준비")
            break;
          
          case responseData.status.startsWith("FTPS_"):
            setState(responseData.status.slice("FTPS_".length) + "번째 FTP 전송중")
            break;
        }
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const getDownloadStatus = async () => {
    const url = "http://localhost:5000/download-status";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain }),
      });
  
      if (response.ok) {
        const responseData = await response.json();
  
        // 데이터 가공
        const processedData = responseData.info.map((item) => {
          let levelText = "INFO";
          if (item.error_lev === 2) levelText = "WARNING";
          else if (item.error_lev === 3) levelText = "ERROR";
  
          return {
            id: item.id,
            crawl_num: item.crawl_num,
            domain_num: item.domain_num,
            level: levelText,
            message: item.error_info,
          };
        });
  
        // 상태 업데이트
        setProgressData(processedData);
      } else if (response.status === 204) {
        console.log("No data for this domain");
        setProgressData([]); // 비워주기
      } else {
        console.error("Request failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
    
 
  useEffect(() => {
    const fetchStatus = async () => {
      await getStatus();
      await getDownloadStatus();
    };
    fetchStatus();
  }, [domain]);

	useEffect(() => {
    const channel = pusher.subscribe('task-channel');

    channel.bind("connect", () => {
      console.log("Pusher connection established");
    });

    // 서버에서 'download_progress' 이벤트를 수신
    channel.bind("download_progress", async (data) => {
      if(data.domain !== domain) return;

      console.log("Download progress received:", data);

      await getDownloadStatus();
    });

    channel.bind("change_state", async (data) => {
      if(data.domain !== domain) return;
      console.log("State Changed");
      if(data.state === "download"){
        setState(data.num + "번째 채증 중")
      } else if(data.state === "ai_analyze"){
        setState(data.num + "번째 분석 중")
      } else if(data.state === "frame"){
        setState(data.num + "번째 영상 처리 중")
      } else if(data.state === "running"){
        setState("Running")
      } else if(data.state === "failure"){
        setState("Failure")
      } else if(data.state === "revoked"){
        setState("Revoked")
      } else if(data.state === "success"){
        setState("Success")
      } else if(data.state === "FTP_Waiting"){
        setState(data.num + "번째 FTP 전송 준비")
      } else if(data.state === "FTP_Sending"){
        setState(data.num + "번째 FTP 전송중")
      }
      await getDownloadStatus();
    });

    channel.bind("disconnect", () => {
      console.log("Pusher connection closed");
    });

    // 컴포넌트 언마운트 시 pusher 연결 해제
    return () => {
      pusher.unsubscribe('task-channel');
    };
  }, [domain]);

  // useEffect(() => {
  //   // WebSocket 연결 (로컬 개발 환경)
  //   const socket = new WebSocket('ws://localhost:8000');
    
  //   // 연결 성공 시
  //   socket.addEventListener('open', (event) => {
  //     console.log("WebSocket 연결 성공");

  //     const initData = { "domain": domain };
  //     socket.send(JSON.stringify(initData));
  //   });
    
  //   // 메시지 수신 시
  //   socket.addEventListener('message', async (event) => {
  //     try {
  //       const data = JSON.parse(event.data);
        
  //       // 다른 도메인의 이벤트는 무시
  //       if (data.domain !== domain) return;
        
  //       console.log("State Changed:", data);
        
  //       // 상태에 따라 UI 업데이트
  //       if (data.state === "download") {
  //         setState(data.num + "번째 채증 중");
  //       } else if (data.state === "ai_analyze") {
  //         setState(data.num + "번째 분석 중");
  //       } else if (data.state === "frame") {
  //         setState(data.num + "번째 영상 처리 중");
  //       } else if (data.state === "running") {
  //         setState("Running");
  //       } else if (data.state === "failure") {
  //         setState("Failure");
  //       } else if (data.state === "revoked") {
  //         setState("Revoked");
  //       } else if (data.state === "success") {
  //         setState("Success");
  //       } else if (data.state === "FTP_Waiting") {
  //         setState(data.num + "번째 FTP 전송 준비");
  //       } else if (data.state === "FTP_Sending") {
  //         setState(data.num + "번째 FTP 전송중");
  //       }
        
  //       // 상태 변경 후 다운로드 상태 업데이트
  //       await getDownloadStatus();
  //     } catch (error) {
  //       console.error("웹소켓 메시지 처리 오류:", error);
  //     }
  //   });
    
  //   // 연결 종료 시
  //   socket.addEventListener('close', (event) => {
  //     console.log("WebSocket 연결 종료:", event);
  //   });
    
  //   // 연결 오류 시
  //   socket.addEventListener('error', (event) => {
  //     console.error("WebSocket 오류:", event);
  //   });
    
  //   // 컴포넌트 언마운트 시 WebSocket 연결 해제
  //   return () => {
  //     if (socket && socket.readyState === WebSocket.OPEN) {
  //       socket.close();
  //     }
  //   };
  // }, [domain]);

  return (
    <div className="collection-content-area">
  <h1>{domain}</h1>

  <div className="button-container">
    <button onClick={startProgress} className="btn start-crawling">
      Start Testing
    </button>
    <button onClick={stopProgress} className="btn stop-crawling">
      Revoke Testing
    </button>
    <div className="crawling-status">
      {state}
    </div>
  </div>

  {/* 에러 리스트 */}
  <div className="error-log-area">
    <h2>Error Logs</h2>

    {progressData.length === 0 ? (
      <div className="no-error-message">No error logs for this domain.</div>
    ) : (
      <table className="error-log-table">
        <thead>
          <tr>
            <th>Crawl #</th>
            <th>Level</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {progressData.map((item) => (
            <tr key={item.id}>
              <td>{item.crawl_num}</td>
              <td className={`level-${item.level.toLowerCase()}`}>{item.level}</td>
              <td>{item.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</div>

  );
}

export default EvidenceCollection;
