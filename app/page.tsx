import Link from "next/link";
import { loadModel } from "@/lib/model";
import { StatBand } from "@/components/statband";
import { Sparkline } from "@/components/sparkline";
import { fmtInt, short } from "@/lib/format";

export const dynamic = "force-static";

export default function Overview() {
  const model = loadModel();
  const s = model.stats;
  const storyEvents = model.timeline.filter((e) => !e.date.includes("2024"));

  return (
    <>
      {/* hero */}
      <section className="hero">
        <div className="wrap hero-in">
          <div className="rise">
            <div className="kicker">Ansem vs. the bear market — a live record</div>
            <h1>
              One trader is trying to <em>airdrop the bull market</em> into existence.
            </h1>
            <p className="lede">
              Since June 27,{" "}
              <a href="https://x.com/blknoiz06" target="_blank" rel="noopener noreferrer">
                Ansem
              </a>{" "}
              has been manually sending his pump.fun creator fees — as $ANSEM, &ldquo;The Black Bull&rdquo; — to
              holders&apos; wallets, chasing 1,000,000 holders. This site traces every transfer out of his airdrop
              wallet: who received it, what it was worth at that moment, and whether they kept it.
            </p>
            <div className="hero-cta">
              <Link href="/ledger/" className="btn btn-gold">
                Open the ledger — {fmtInt(s.unique_recipients)} wallets
              </Link>
              <Link href="/receipts/" className="btn btn-ghost">
                Read the receipts
              </Link>
            </div>
          </div>
          <div className="hero-bull rise rise-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bull-hero.png" alt="The Black Bull" />
          </div>
        </div>
      </section>

      {/* stat band */}
      <StatBand model={model} />

      {/* chart */}
      <section className="section chart-band">
        <div className="wrap">
          <div className="section-head">
            <h2>The chart is the plot</h2>
            <span className="tail">
              hourly closes, GeckoTerminal · PumpSwap pool{" "}
              <a
                href="https://solscan.io/account/FnzKY6x7entQ1eR3D225dQyT7ybfka4PskBMQhb8L3CC"
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
              >
                FnzK…L3CC
              </a>
            </span>
          </div>
          <Sparkline
            series={model.price_series}
            dropStart={s.first_drop_ts as number | null}
            dropEnd={s.last_drop_ts as number | null}
          />
          <div className="spark-meta">
            <span className="mk">
              <i />
              price since launch, Jun 16
            </span>
            <span className="mk drop">
              <i />
              airdrop window
            </span>
            <span>
              ten quiet days at <b className="mono">$0.0002</b>, then the Jun 27 creator-fee pledge — and a{" "}
              <b className="mono">~900×</b> run to the <b className="mono">$0.1798</b> ATH on Jul 2
            </span>
          </div>
        </div>
      </section>

      {/* story */}
      <section className="section">
        <div className="wrap story-grid">
          <div className="story-side">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <h2>How it started</h2>
            </div>
            <p>
              An anonymous deployer launched the token, gifted Ansem 65% of the supply, and walked away with about
              $5.5K. Ten days later a follower suggested airdropping the creator fees. Ansem said yes — and the
              trenches got their stimulus.
            </p>
            <div className="q">
              &ldquo;we will simply bully them all into airdropping — they have to realize the bull market is
              beginning now&rdquo;
              <b>— Ansem, Jun 29 · 3.1K likes</b>
            </div>
            <div className="hero-cta">
              <Link href="/receipts/" className="btn btn-ghost">
                Every tweet, in order
              </Link>
            </div>
          </div>
          <div className="tl">
            {storyEvents.map((e, i) => (
              <div
                className={`ev ${/expos|dump|copycat|decoy|scrutin/i.test(e.event) ? "neg" : ""}`}
                key={i}
              >
                <div className="d">{e.date}</div>
                <p>{e.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* wallets */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>The wallets that matter</h2>
            <span className="tail">verify everything on Solscan</span>
          </div>
          <div className="wallets-grid">
            <div className="wcol">
              <h4>The airdrop wallet</h4>
              <div className="wline">
                <span className="k">Address</span>
                <a href={`https://solscan.io/account/${model.airdrop_wallet}`} target="_blank" rel="noopener noreferrer">
                  {short(model.airdrop_wallet)} ↗
                </a>
              </div>
              <div className="wline">
                <span className="k">Holds</span>
                <span className="v plain">584.3M · 58.4% of supply</span>
              </div>
              <div className="wline">
                <span className="k">Sends</span>
                <span className="v plain">every airdrop, by hand</span>
              </div>
              <div className="wline">
                <span className="k">pump.fun</span>
                <span className="v plain">ansemconzimp</span>
              </div>
            </div>
            <div className="wcol">
              <h4>The deployer</h4>
              <div className="wline">
                <span className="k">Address</span>
                <a
                  href="https://solscan.io/account/yHCxHBEaJW5tbndqC8JciSThr7U1cqLpdcsvHcx6PRe"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  yHCx…6PRe ↗
                </a>
              </div>
              <div className="wline">
                <span className="k">Identity</span>
                <span className="v plain">anonymous</span>
              </div>
              <div className="wline">
                <span className="k">Gave Ansem</span>
                <span className="v plain">650M · 65% of supply</span>
              </div>
              <div className="wline">
                <span className="k">Kept for self</span>
                <span className="v plain">~$5.5K profit, total</span>
              </div>
            </div>
            <div className="wcol danger">
              <h4>⚠ The decoy</h4>
              <p>
                A copycat &ldquo;ANSEM&rdquo; mint (<span className="mono">BWVL…p7Y7</span>) flashes a fake{" "}
                <b>$86M</b> of one-sided liquidity on a decoy Raydium pool to bait buyers. The only authentic mint
                ends in <span className="mono" style={{ color: "var(--gold-bright)" }}>pump</span> — copy it from
                the top bar, never from search.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* methodology */}
      <section className="section" style={{ borderBottom: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Methodology</h2>
            <span className="tail">how this data is made</span>
          </div>
          <div className="method-grid">
            <ul>
              <li>
                All {fmtInt(s.total_transfers)} outgoing $ANSEM transfers are read signature-by-signature from the
                airdrop wallet&apos;s token account on Solana mainnet — no third-party indexers.
              </li>
              <li>USD values use the hourly candle close at each transfer&apos;s block time — approximate by nature.</li>
              <li>Identities come from pump.fun public profiles and SNS (.sol) reverse lookups. No identity is guessed.</li>
              <li>
                &ldquo;Holding / sold&rdquo; compares a wallet&apos;s current balance against what it received;
                tokens moved to another wallet count as sold.
              </li>
              <li>
                Tweets are archived via the X API and X&apos;s public embed CDN; engagement counts are as-of archive
                time.
              </li>
            </ul>
            <ul>
              <li>
                <a
                  href="https://thedefiant.io/news/defi/ansem-airdrops-usd7m-of-usdansem-memecoin-in-bid-to-reach-1m-holders"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Defiant — the $7M airdrop
                </a>
              </li>
              <li>
                <a
                  href="https://www.cryptotimes.io/2026/06/30/ansems-9-43m-ansem-airdrop-7-wallets-got-74-already-dumping/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Crypto Times — 7 wallets got 74%
                </a>
              </li>
              <li>
                <a href="https://cryptobriefing.com/ansem-airdrops-7m-ansem-memecoin-solana/" target="_blank" rel="noopener noreferrer">
                  Crypto Briefing — campaign coverage
                </a>
              </li>
              <li>
                <a href="https://beincrypto.com/ansem-token-creator-fee-airdrop-solana/" target="_blank" rel="noopener noreferrer">
                  BeInCrypto — the creator-fee pledge
                </a>
              </li>
              <li>
                <a href={`https://solscan.io/token/${model.mint}`} target="_blank" rel="noopener noreferrer">
                  Solscan — verify it yourself
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
