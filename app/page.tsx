import Link from "next/link";

export default function HomePage() {
  return (
    <div className="home-container">
      <h1 className="home-title">Crypto API – Live Prices</h1>
      <p className="subtitle" style={{ marginBottom: 32 }}>
        Select an exchange to view live market data
      </p>
      <div className="exchange-links">
        <Link href="/nobitex" className="exchange-link nobitex">
          Nobitex
          <span className="exchange-desc">Iranian exchange · RLS & USDT markets</span>
        </Link>
        <Link href="/wallex" className="exchange-link wallex">
          Wallex
          <span className="exchange-desc">Iranian exchange · TMN & USDT markets</span>
        </Link>
        <Link href="/ramzinex" className="exchange-link" style={{ borderColor: "rgba(180,100,255,.4)", color: "#b46fff" }}>
          Ramzinex
          <span className="exchange-desc">Iranian exchange · RLS & USDT markets</span>
        </Link>
        <Link href="/withdraw-networks" className="exchange-link" style={{ borderColor: "rgba(136,136,255,.4)", color: "#88f" }}>
          Withdraw Networks DB
          <span className="exchange-desc">Nobitex · Active withdrawal networks per coin</span>
        </Link>
      </div>
    </div>
  );
}
