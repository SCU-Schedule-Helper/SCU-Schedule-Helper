import React, { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import SendIcon from "@mui/icons-material/Send";
import AuthWrapper from "./authWrapper";

export default function ChatAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your course planning assistant. How can I help you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");

    // Simulate assistant response
    setTimeout(() => {
      const assistantResponse = {
        id: messages.length + 2,
        text: "I understand you're asking about course planning. Let me help you with that!",
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantResponse]);
    }, 1000);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AuthWrapper>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: 2,
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#703331",
            fontWeight: "bold",
            textAlign: "center",
            mb: 1,
          }}
        >
          Chat with Assistant
        </Typography>

        {/* Messages Container */}
        <Paper
          elevation={2}
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            padding: 2,
            backgroundColor: "#f8f9fa",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                mb: 1,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  padding: 1.5,
                  maxWidth: "80%",
                  backgroundColor: message.sender === "user" ? "#802a25" : "white",
                  color: message.sender === "user" ? "white" : "black",
                  borderRadius: 2,
                  wordWrap: "break-word",
                }}
              >
                <Typography variant="body2">{message.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    opacity: 0.7,
                    fontSize: "0.7rem",
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Input Container */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-end",
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === ""}
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              minWidth: "auto",
              px: 2,
              py: 1.5,
              "&:hover": {
                backgroundColor: "#671f1a",
              },
              "&:disabled": {
                backgroundColor: "#ccc",
              },
            }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Box>
    </AuthWrapper>
  );
} 