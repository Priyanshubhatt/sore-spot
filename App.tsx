import { StatusBar } from 'expo-status-bar';
import HelloScreen from './app/HelloScreen';

export default function App() {
  return (
    <>
      <HelloScreen />
      <StatusBar style="auto" />
    </>
  );
}
