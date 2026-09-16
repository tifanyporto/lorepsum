# The phone that became a server

How a reused Android handset became the Linux machine running lorepsum's PostgreSQL, reachable from anywhere.

This was a deliberate choice: hardware I own, no monthly cost, and real infrastructure instead of a button that says *create database*. A modern smartphone is a low-power ARM computer with a **built-in UPS** — its own battery. Rather than becoming e-waste in a drawer, it became a server.

> **Status: running and reboot-proof** since 2026-08-17, proven by pulling the plug — wifi, Tailscale, Postgres and the firewall all come back on their own.
>
> This documents what **actually worked**, not the original plan. Where the first draft was wrong, the mistake is noted — it is the useful part.

---

## The architecture

- **Where it runs:** the phone, on [postmarketOS](https://postmarketos.org/) — real Linux for phones, built on **Alpine**, ARM64. Not Termux, not a container.
- **How it is reached:** [Tailscale](https://tailscale.com/), a private network connecting only my own devices. Nothing is exposed to the internet, and NAT/CGNAT is irrelevant because the connection dials outward.
- **No lock-in:** it is stock PostgreSQL. Moving to another host changes only the connection string; the schema travels as code, in migrations under git.

```
[ any machine of mine ] --(Tailscale)--> [ phone / postmarketOS / PostgreSQL 18 ]
```

---

## Before you start

**Is your device supported?** Find your model and its **codename** in the [postmarketOS device list](https://wiki.postmarketos.org/wiki/Devices). Every device has its own wiki page with support status and quirks. Wherever this text says ⚠️, confirm it on the page for **your** model.

> Mine is a **POCO F3** (codename `alioth`), Snapdragon 870, 6–8 GB of RAM.

Four warnings worth reading before you erase a phone:

- Flashing **wipes the device completely**.
- **Wifi is the biggest technical risk.** A phone has no ethernet port, so wifi is the *only* way the server exists on the network. Each model needs its own firmware (on the POCO F3, `ath11k`), usually extracted from the Android partition. **Validate this early** — no wifi, no server.
- **A power cut kills it instantly** if the battery is removed or dead. When power returns, everything comes back by itself.
- You become the administrator: updates, security and **backups** are now yours.

---

## Step 0 — Unlock the bootloader

The bootloader decides which system is allowed to start, and ships locked to the manufacturer's software. Until it is unlocked, no Linux can be installed.

⚠️ This varies wildly by manufacturer. Google and Motorola tend to be straightforward. Xiaomi is not.

> On the POCO F3: request permission through the **Mi Community** app (Global region) → **Mi Unlock Tool** on the PC with the account and phone linked → **wait 168 hours** → unlock.

## Step 1 — Tooling on the PC

`pmbootstrap` builds the image and runs on Linux. On Windows, that means **WSL**:

```powershell
wsl --install
```

Then, inside the WSL Ubuntu:

```bash
pip install pmbootstrap
```

## Step 2 — Build the image

```bash
pmbootstrap init      # vendor and device = YOUR handset; UI = console (headless)
pmbootstrap install   # builds the system, sets user and password
```

## Step 3 — Flash it

Put the phone in **fastboot** (usually: powered off → Power + Volume Down) and flash.

⚠️ **WSL trap:** WSL2 has no native USB access. Either use `usbipd-win` to attach the phone to WSL, or export the image and flash from Windows with `fastboot`. The exact flash commands live on your device's wiki page.

## Step 4 — First boot and wifi

Boot postmarketOS, log in, and **connect to wifi**. This is where the project lives or dies — see the warning above.

## Step 5 — SSH, then headless

Enable **SSH**. From then on the phone needs no screen — everything happens from another machine's terminal. Also configure it not to suspend, and to keep the display off.

---

## Step 6 — PostgreSQL 18

⚠️ **The first draft of this document said OpenRC and `apk add postgresql`. Both were wrong.** postmarketOS uses **systemd**, and the package needs the version in its name:

```bash
sudo apk add postgresql18
```

The package does **not** create a cluster. Create one by hand:

```bash
sudo -u postgres initdb -D /var/lib/postgresql/18/data
```

### The systemd unit, and the one line that matters

Create `/etc/systemd/system/postgresql.service`. The directive that matters is `RuntimeDirectory`:

```ini
[Service]
Type=notify
User=postgres
RuntimeDirectory=postgresql
ExecStart=/usr/libexec/postgresql18/postgres -D /var/lib/postgresql/18/data
```

> **Why it exists.** Postgres needs `/run/postgresql` to create its socket lock file. `/run` is **recreated empty on every boot**, so without `RuntimeDirectory=postgresql` the directory is missing and the service dies with `could not create lock file`. systemd creates it — with the right owner — before starting the process.

```bash
sudo systemctl enable --now postgresql
sudo -u postgres createdb lorepsum
```

Set a password for the `postgres` user and **keep it** — it goes in the connection string.

### Allowing connections over the private network

Postgres only accepts remote connections if `pg_hba.conf` says so. In `/var/lib/postgresql/18/data/pg_hba.conf`:

```
host  all  all  100.64.0.0/10  scram-sha-256
```

`100.64.0.0/10` is the address range Tailscale uses. Then, without restarting:

```sql
SELECT pg_reload_conf();
```

Also confirm `postgresql.conf` has `listen_addresses = '*'`.

---

## Step 7 — Tailscale

```bash
sudo apk add tailscale
sudo systemctl enable --now tailscaled
sudo tailscale up --accept-dns=false
```

⚠️ **`--accept-dns=false` is not optional here.** Without it, Tailscale hijacks the device's `resolv.conf` and fails to reconnect after a reboot — the server comes up, but nothing can reach it.

Install Tailscale on your other machines too. The phone gets a fixed private address that only your own devices can see.

## Step 8 — Firewall

Port 5432 must open **only** on the Tailscale interface, never on the LAN. A drop-in at `/etc/nftables.d/50_tailscale.nft`:

```
iifname "tailscale0" tcp dport 5432 accept
```

With that in place, someone else on the same wifi cannot reach the database.

## Step 9 — Point the app at it

In `backend/.env`, which is not tracked by git:

```
DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@<tailscale-ip>:5432/lorepsum
```

Get the address with `tailscale status` from any machine on the tailnet.

## Step 10 — Backups

The data lives on a single phone. Backups are not optional:

```bash
pg_dump lorepsum > backup.sql
```

Automate it with cron and keep **one copy off-site** — cloud or an external drive — against fire and theft. And **test the restore**: an untested backup is not a backup.

---

## The three classic connection failures

When the app cannot reach the database, it is almost always one of these — and each has its own symptom:

| Symptom | Cause | Fix |
|---|---|---|
| **timeout** | the client machine is not on the tailnet | `tailscale status` and `tailscale ping <host>` from the client |
| **`no pg_hba entry for host`** | `pg_hba.conf` does not allow the Tailscale range | the `100.64.0.0/10` line from Step 6, then `SELECT pg_reload_conf()` |
| **`password authentication failed`** | the `postgres` password does not match `.env` | reset one of the two |

---

## Honest about the risks

- **Uptime.** Home power and home internet are not a datacentre. The server goes down, and while it is down nothing works.
- **Wifi.** Still the biggest technical risk, and it varies by model.
- **Maintenance.** Updates, security and backups are on you.

In exchange: a server that is entirely mine, built from a device that was headed for a drawer.

## Sources

- [postmarketOS — device list](https://wiki.postmarketos.org/wiki/Devices)
- [pmbootstrap](https://wiki.postmarketos.org/wiki/Pmbootstrap)
- [Tailscale](https://tailscale.com/kb/)
