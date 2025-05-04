import React from 'react'

function App(): React.JSX.Element {
  return (
    <div className="container">
      <style>
        {`
          :root {
            background-color: #1a1a1a;
          }
          
          html, body, #root, .container {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
            color: white;
            height: 100%;
            width: 100%;
            overflow: hidden;
            font-family: system-ui, -apple-system, sans-serif;
          }
          
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            -webkit-app-region: drag;
          }
          
          .title {
            font-size: 24px;
            margin-bottom: 16px;
            text-align: center;
          }
          
          .description {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            max-width: 300px;
            margin-bottom: 24px;
          }
          
          .button {
            background-color: #f5455c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            -webkit-app-region: no-drag;
          }
        `}
      </style>
      
      <h1 className="title">Berri v1</h1>
      <p className="description">
        Welcome to the basic Electron app! This is a starter template.
      </p>
      <button className="button" onClick={() => alert('Button clicked!')}>
        Click Me
      </button>
    </div>
  )
}

export default App
