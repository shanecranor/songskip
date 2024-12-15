import "./App.css";
import { ShaderBackground } from "./components/ShaderBackground/ShaderBackground.tsx";
import shaderString from "@/shaders/shader.frag?raw";
import vertexShaderString from "@/shaders/shader.vert?raw";

const App = () => {
  return (
    <div className="p-home">
      <ShaderBackground fragShader={shaderString} vertShader={vertexShaderString} />
      <h1>welcome to songskip</h1>
    </div>
  );
};

export default App;
