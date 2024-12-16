import "./App.css";
import DataUpload from "./components/DataUpload/DataUpload.tsx";
import { ShaderBackground } from "./components/ShaderBackground/ShaderBackground.tsx";
import shaderString from "@/shaders/shader.frag?raw";

const App = () => {
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
          <button>Let's go</button>
          {/* <DataUpload />  */}
        </div>
      </div>
    </div>
  );
};

export default App;
