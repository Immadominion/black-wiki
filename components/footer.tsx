export function Footer({ generatedAt }: { generatedAt?: string }) {
  return (
    <footer className="site-footer">
      <div className="wrap foot-in">
        <div>
          <div className="foot-brand">Black Bull Ledger</div>
          <p>
            Independent community record of the $ANSEM airdrop campaign. Every figure is derived from Solana
            mainnet or archived from X — verify anything on{" "}
            <a
              href="https://solscan.io/token/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump"
              target="_blank"
              rel="noopener noreferrer"
            >
              Solscan
            </a>
            . Not affiliated with Ansem or pump.fun. Not financial advice — most memecoins go to zero.
          </p>
        </div>
        <div className="foot-meta mono">
          {generatedAt ? <span>data refresh {generatedAt.slice(0, 10)}</span> : null}
          <span>price: live via DexScreener</span>
        </div>
      </div>
    </footer>
  );
}
