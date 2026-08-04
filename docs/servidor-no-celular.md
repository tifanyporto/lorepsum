# Servidor no celular — um Android virando o servidor do Lorepsum

Este tutorial mostra como transformar **um celular Android reaproveitado** num **servidor Linux** que roda o banco do Lorepsum, acessível de qualquer lugar. É uma escolha **deliberada** — soberania (hardware próprio), custo quase zero e infraestrutura de verdade.

Serve para **qualquer aparelho suportado** pelo postmarketOS. Ao longo do texto, onde aparecer "seu aparelho", troque pelo seu modelo.

> 💡 **No meu caso**, uso um **POCO F3** (codinome `alioth`). Mas o processo abaixo é o mesmo para outros celulares suportados — só mudam alguns detalhes específicos do modelo (principalmente o desbloqueio e a firmware do wifi).

---

## Antes de tudo: seu aparelho é suportado?

Comece descobrindo se o seu celular está na lista do postmarketOS e qual é o **codinome** dele (cada modelo tem um):

👉 **[Lista de dispositivos do postmarketOS](https://wiki.postmarketos.org/wiki/Devices)**

Cada aparelho tem uma **página própria** no wiki, com o status do suporte e as particularidades do modelo. **Sempre que este tutorial marcar ⚠️, confirme na página do SEU aparelho.**

## Por que um celular?

Um smartphone moderno é um **computador ARM potente**, com baixo consumo e silencioso. Em vez de virar lixo eletrônico na gaveta, ele vira um **servidor sempre ligado**. *(Meu POCO F3, por exemplo, tem um Snapdragon 870 e 6–8 GB de RAM — mais que muitos servidores baratos alugados e que um Raspberry Pi.)*

## A arquitetura (dois eixos)

- **Onde roda:** o celular, com **postmarketOS** — um Linux de verdade feito para celulares (base **Alpine Linux**, ARM64).
- **Como alcanço de qualquer lugar:** **Tailscale** — uma VPN privada que liga só os *seus* dispositivos, **sem expor nada à internet** e contornando o NAT/CGNAT (a conexão sai de dentro pra fora).
- **Portabilidade (sem aprisionamento):** o banco é **PostgreSQL padrão**. Se um dia trocar de host, muda só a *connection string* — o esquema viaja como código (migrations + git).

```
[ qualquer máquina sua ] --(Tailscale, rede privada)--> [ seu celular / postmarketOS / PostgreSQL ]
```

## ⚠️ Antes de começar

- O flash **APAGA o celular inteiro**. Faça backup do que quiser guardar.
- É um caminho **experimental**. Sempre confirme os passos do modelo na página do seu aparelho.
- **Risco nº 1 — o wifi:** como o celular não tem porta de rede cabeada, o wifi é a **única** forma de o servidor existir na rede. Cada modelo tem sua firmware de wifi (no meu POCO F3, por exemplo, é a `ath11k`). **Valide isso cedo.**
- Se for tirar/desativar a bateria, lembre: **sem bateria não há "nobreak"** — qualquer queda de energia desliga o aparelho. Por isso o **backup** é essencial.

---

## Passo 0 — Desbloquear o bootloader

O **bootloader** é o primeiro programa ao ligar; ele decide qual sistema pode iniciar, e vem trancado (só aceita o software do fabricante). Sem destravá-lo, nenhum Linux instala.

⚠️ **O processo varia por fabricante** — alguns são simples (Google, Motorola costumam ser tranquilos), outros são chatos. Veja o do seu aparelho.
> No meu caso (Xiaomi): pedir permissão pelo app **Mi Community** (região Global) → **Mi Unlock Tool** no PC (conta + celular vinculados) → **espera de 168h** → destravar.

## Passo 1 — Ferramentas no PC (WSL + pmbootstrap)

O `pmbootstrap` (que monta a imagem do postmarketOS) roda em Linux. No Windows, usamos o **WSL** (um Linux dentro do Windows).

```powershell
# PowerShell como administrador
wsl --install
```
Depois, dentro do Ubuntu (WSL):
```bash
pip install pmbootstrap    # ou via pipx/git — ver docs do pmbootstrap
```

## Passo 2 — Montar a imagem do postmarketOS

```bash
pmbootstrap init      # escolher: vendor e device = os DO SEU aparelho; UI = console (headless)
pmbootstrap install   # gera o sistema; define usuário e senha
```
> ⚠️ Use o **vendor/codinome do seu modelo** (o que você achou na lista de dispositivos).

## Passo 3 — Gravar (flash) no celular

Coloque o celular em **modo fastboot** (normalmente: desligado → Power + Volume Baixo), conecte no PC e grave a imagem.

> ⚠️ **Gotcha do WSL + USB:** o WSL2 não acessa USB nativamente. Duas saídas: usar o **`usbipd-win`** para "passar" o celular pro WSL, **ou** exportar a imagem e flashar pelo **Windows** com `fastboot`. Os comandos exatos de flash estão na página do seu aparelho.

## Passo 4 — Primeiro boot + wifi

Dê boot no postmarketOS, faça login e **conecte no wifi**.

> ⚠️ **O ponto crítico:** o wifi de muitos celulares precisa de uma **firmware proprietária** (geralmente extraída da partição do Android). Se o wifi não subir, o servidor fica inalcançável. **Valide aqui antes de seguir.** Passos na página do seu aparelho.

## Passo 5 — Acesso por terminal (SSH) → headless

Habilite o **SSH** no celular. A partir daí, ele vira **headless** (sem tela) — você acessa tudo pelo terminal de outra máquina. Configure também pra **não suspender** e manter a tela apagada.

## Passo 6 — PostgreSQL

O postmarketOS é **Alpine**, então o gerenciador de pacotes é o `apk` e os serviços usam **OpenRC**:
```bash
sudo apk add postgresql
# inicializar o cluster e subir o serviço (ver docs do Alpine/pmOS):
sudo rc-service postgresql start
sudo rc-update add postgresql        # inicia junto com o sistema
# criar o banco do projeto:
createdb lorepsum
```
> ⚠️ Ajuste usuário/senha e o `initdb` conforme a doc do Alpine. Guarde a senha — ela vai na *connection string*.

## Passo 7 — Tailscale (acesso de qualquer lugar)

```bash
sudo apk add tailscale
sudo rc-service tailscaled start
sudo rc-update add tailscaled
sudo tailscale up          # faz login e entra na sua rede privada
```
Instale o Tailscale também nos seus PCs. Assim o celular ganha um **endereço privado fixo** que só os seus aparelhos enxergam.

## Passo 8 — Conectar o Lorepsum ao servidor

No backend, a *connection string* passa a apontar pro **IP Tailscale** do celular (e o segredo mora no `.env`, fora do git):
```
postgresql+psycopg2://usuario:senha@<ip-tailscale-do-celular>:5432/lorepsum
```
De qualquer máquina na sua rede Tailscale, o Lorepsum alcança o banco.

## Passo 9 — Backup (essencial)

Como os dados moram num único celular, backup **não é opcional**:
```bash
pg_dump lorepsum > backup.sql      # automatizar via cron; enviar cópia pra outro lugar
```
Ter **1 cópia fora de casa** (nuvem/HD) protege contra incêndio/roubo. E **teste a restauração** — backup não testado não é backup.

---

## Honestidade sobre os riscos

- **Uptime:** internet/energia de casa não são de datacenter. O servidor pode cair — e aí você fica sem acesso até resolver.
- **Wifi:** costuma ser o maior risco técnico (Passo 4), e varia por modelo.
- **Manutenção:** você vira o administrador (updates, segurança, backup).

Mesmo com tudo isso, o resultado é um servidor **100% seu**, feito de um aparelho que ia pro lixo. É esse o ponto. 🔋 → 🖥️

## Fontes

- [postmarketOS — lista de dispositivos](https://wiki.postmarketos.org/wiki/Devices) (ache a página do **seu** aparelho)
- [pmbootstrap](https://wiki.postmarketos.org/wiki/Pmbootstrap)
- [Tailscale](https://tailscale.com/kb/)
