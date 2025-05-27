import { useState, useRef } from "react";
import { useChat } from "../hooks/useChat";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message } = useChat();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (!isChrome) {
      alert("⚠️ L'option 'Parlez' fonctionne uniquement sur Google Chrome.");
      return;
    }
  
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("❌ Votre navigateur ne supporte pas la reconnaissance vocale.");
  
    const recog = new SR();
  
    recog.continuous = true;
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.lang = "fr-FR";
  
    recog.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("🎙️ Transcript:", transcript);
      chat(transcript);
    };
  
    recog.onend = () => {
      console.log("🎙️ Reconnaissance terminée.");
      if (listening) {
        console.log("🎙️ Relance automatique…");
        recog.start();
      }
    };
  
    recog.onerror = (err) => {
      console.error("Speech API error:", err);
      setListening(false);
    };
  
    recognitionRef.current = recog;
    setListening(true);
    recog.start();
  };
  
  

  const sendMessage = () => {
    const text = input.current.value.trim();
    if (!loading && !message && text) {
      chat(text);
      input.current.value = "";
    }
  };

  if (hidden) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        {/* En-tête Fondation */}
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg flex items-center gap-2">
          <img
            src="images/logo-chaptal.png"
            alt="Fondation Léonie Chaptal"
            className="h-10"
          />
          <span className="text-lg font-semibold text-chaptal-purple">
            Fondation Léonie Chaptal
          </span>
        </div>

        {/* Boutons auxiliaires */}
        <div className="w-full flex flex-col items-end justify-center gap-4 pointer-events-auto">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="bg-chaptal-green hover:bg-chaptal-green-dark text-white p-4 rounded-md"
          >
                       {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => document.body.classList.toggle("greenScreen")}
            className="bg-chaptal-green hover:bg-chaptal-green-dark text-white p-4 rounded-md"
          >
          <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>

        {/* Zone input + reconnaissance vocale */}
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <input
            ref={input}
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Tapez un message ou utilisez 🎙️"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading || message}
          />

          {/* Bouton envoi texte */}
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`
              bg-chaptal-green hover:bg-chaptal-green-dark text-white p-4 px-6 
              font-semibold uppercase rounded-md ${loading||message?"opacity-30 cursor-not-allowed":""}
            `}
          >
            Send
          </button>

          {/* Bouton micro */}
          <button
            onClick={startListening}
            // disabled={listening || loading || message}
            disabled={listening || loading}
            className={`
              bg-chaptal-green hover:bg-chaptal-green-dark text-white p-4 rounded-md
              ${listening?"bg-gray-400 cursor-wait":""}
            `}
          >
            {listening ? "🎙️ ..." : "🎙️ Parlez"}
          </button>
        </div>
      </div>
    </>
  );
};
