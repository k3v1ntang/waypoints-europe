import { MotionConfig } from 'motion/react';
import Map from './components/Map';
import './App.css';

// ❓ CONCEPT: MotionConfig reducedMotion="user"
// 📝 EXPLANATION: one global switch for the motion library - when the OS
// "Reduce Motion" setting is on, every spring/transform animation in the
// tree is replaced with an instant cross-fade. The CSS animations honor
// the same setting via @media (prefers-reduced-motion: reduce).
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="App">
        <Map />
      </div>
    </MotionConfig>
  );
}

export default App;
