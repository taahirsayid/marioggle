import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { HowToPlayPage } from './pages/HowToPlayPage';
import { SoloSetupPage } from './pages/SoloSetupPage';
import { GamePage } from './pages/GamePage';
import {
  CreateRoomPage,
  JoinRoomPage,
  RoomLobbyPage,
  ResultsPage,
} from './pages/MultiplayerPages';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-to-play" element={<HowToPlayPage />} />
      <Route path="/solo" element={<SoloSetupPage />} />
      <Route path="/create" element={<CreateRoomPage />} />
      <Route path="/join" element={<JoinRoomPage />} />
      <Route path="/join/:inviteToken" element={<JoinRoomPage />} />
      <Route path="/room/:roomId" element={<RoomLobbyPage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
      <Route path="/results/:gameId" element={<ResultsPage />} />
    </Routes>
  );
}
