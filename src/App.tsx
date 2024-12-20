import { observer, useObservable } from "@legendapp/state/react";
import "./App.css";
import DataUpload from "./components/DataUpload/DataUpload.tsx";
import { ShaderBackground } from "./components/ShaderBackground/ShaderBackground.tsx";
import shaderString from "@/shaders/shader.frag?raw";
import { useRef } from "react";
import { uiState$ } from "./state.ts";
import { Slideshow } from "./components/Slideshow/Slideshow.tsx";
const App = observer(() => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <div className="p-home">
      <ShaderBackground fragShader={shaderString} />
      <div className="page-contents">
        <div className="hero-box">
          <h1 className="header">
            See the music you <em>hated</em> in {new Date().getFullYear()}
          </h1>
          <p className="sub-header">
            Find the songs that are killing your vibe.{" "}
          </p>
          <button
            className="buttonify"
            onClick={() => dialogRef.current?.showModal()}
          >
            Let's go
          </button>
          <dialog className="upload-modal" ref={dialogRef} onClose={() => {}}>
            <DataUpload />
          </dialog>
        </div>
        <Slideshow />
      </div>
    </div>
  );
});

export default App;
