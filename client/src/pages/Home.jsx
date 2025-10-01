export default function Home() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center bg-black text-white space-y-6">
      <h1 className="text-4xl font-bold text-green-400 drop-shadow">🎰 Stake Bros</h1>
      <p className="text-lg">ברוכים הבאים לאתר של החבר'ה 💥</p>
      <a href="/profile/alon-k" className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-xl transition">כנסו לפרופיל של ALON K</a>
    </div>
  )
}