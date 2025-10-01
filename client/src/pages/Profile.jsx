import alonImg from '/alon-k.png'

export default function Profile() {
  const playSound = () => {
    const audio = new Audio('http://localhost:3000/audio/bamp.mp3');
    audio.play();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center space-y-6 p-6">
      <img src={alonImg} alt="ALON K" className="w-60 h-60 rounded-full border-4 border-green-400 shadow-lg" />
      <h2 className="text-3xl font-bold text-green-400">ALON K</h2>
      <p className="italic text-gray-400">The Vacuum Cleaner</p>
      <button onClick={playSound} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-xl transition">▶️ בקשה תביא לי עוד באמפ</button>
    </div>
  );
}