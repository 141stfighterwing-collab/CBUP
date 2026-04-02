#!/usr/bin/env bash
set -euo pipefail

#
# ██████╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ███████╗
# ██╔══██╗██╔═══██╗████╗  ██║██╔════╝ ██╔══██╗██╔════╝
# ██████╔╝██║   ██║██╔██╗ ██║██║  ███╗██████╔╝█████╗
# ██╔═══╝ ██║   ██║██║╚██╗██║██║   ██║██╔══██╗██╔══╝
# ██║     ╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║███████╗
# ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
#
# Cyber Brief Unified Platform — 1-Click Installer
# 
# Supports: Ubuntu 20.04+, Debian 11+, CentOS 8+, RHEL 8+
# Install modes: bare-metal, docker
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/YOUR-ORG/cyber-brief-up/main/install.sh | bash
#   ./install.sh                      # Interactive install
#   ./install.sh --docker             # Docker install
#   ./install.sh --port 8080          # Custom port
#   ./install.sh --yes                # Non-interactive
#   ./install.sh --uninstall          # Remove CBUP
#

# ─── Colors ───────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─── Globals ──────────────────────────────────────────
INSTALL_DIR="/opt/cbup"
DATA_DIR="/var/lib/cbup"
LOG_DIR="/var/log/cbup"
BACKUP_DIR="/var/backups/cbup"
SERVICE_NAME="cbup"
PORT=3000
USE_DOCKER=false
NONINTERACTIVE=false
UNINSTALL=false
BRANCH="main"
REPO_URL="https://github.com/YOUR-ORG/cyber-brief-up.git"

# ─── Helpers ──────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR]${NC}   $*"; }
step()    { echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${NC}"; }
die()     { error "$*"; exit 1; }

separator() {
  echo -e "\n${DIM}─────────────────────────────────────────────────${NC}"
}

banner() {
  separator
  echo -e "${BOLD}${CYAN}"
  cat << 'BANNER'
   ██████╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ███████╗
  ██╔══██╗██╔═══██╗████╗  ██║██╔════╝ ██╔══██╗██╔════╝
  ██████╔╝██║   ██║██╔██╗ ██║██║  ███╗██████╔╝█████╗
  ██╔═══╝ ██║   ██║██║╚██╗██║██║   ██║██╔══██╗██╔══╝
  ██║     ╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║███████╗
  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
BANNER
  echo -e "${NC}${DIM}  Cyber Brief Unified Platform — 1-Click Installer${NC}"
  separator
}

ask() {
  if $NONINTERACTIVE; then
    echo "$1 (default: $2) → using default"
    return 0
  fi
  read -rp "$(echo -e "${CYAN}$1${NC} (default: ${GREEN}$2${NC}): ")" val
  val="${val:-$2}"
  echo "$val"
}

ask_yes() {
  if $NONINTERACTIVE; then
    return 0
  fi
  read -rp "$(echo -e "${CYAN}$1${NC} [Y/n]: ")" val
  [[ -z "$val" || "$val" =~ ^[Yy] ]]
}

# ─── Pre-flight Checks ────────────────────────────────
check_root() {
  if [[ $EUID -ne 0 ]]; then
    die "This installer must be run as root (use sudo ./install.sh)"
  fi
}

check_os() {
  step "Checking operating system"
  
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="${ID}"
    OS_VERSION="${VERSION_ID}"
    OS_NAME="${PRETTY_NAME}"
  else
    die "Cannot detect OS. /etc/os-release not found."
  fi

  case "$OS_ID" in
    ubuntu|debian|linuxmint|pop)
      ok "Detected: $OS_NAME"
      PKG_MANAGER="apt-get"
      ;;
    centos|rhel|rocky|almalinux|fedora)
      ok "Detected: $OS_NAME"
      PKG_MANAGER="dnf"
      ;;
    amzn|amazon)
      ok "Detected: Amazon Linux"
      PKG_MANAGER="yum"
      ;;
    *)
      warn "Detected: $OS_NAME — not officially tested, continuing anyway"
      PKG_MANAGER="apt-get"
      ;;
  esac
}

check_arch() {
  step "Checking architecture"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64|amd64)  ok "Architecture: x86_64 — supported" ;;
    aarch64|arm64) ok "Architecture: ARM64 — supported" ;;
    *)             die "Architecture $ARCH is not supported" ;;
  esac
}

check_existing() {
  if [[ -d "$INSTALL_DIR" ]] && [[ -f "$INSTALL_DIR/package.json" ]]; then
    warn "CBUP is already installed at $INSTALL_DIR"
    if ask_yes "Would you like to update/overwrite the existing installation?"; then
      info "Will update existing installation"
      return 1  # exists, update
    else
      info "Installation cancelled"
      exit 0
    fi
  fi
  return 0  # fresh install
}

# ─── Docker Install Path ──────────────────────────────
install_docker() {
  step "Installing via Docker"
  
  if ! command -v docker &>/dev/null; then
    info "Docker not found. Installing Docker Engine..."
    
    case "$PKG_MANAGER" in
      apt-get)
        apt-get update -qq
        apt-get install -y -qq ca-certificates curl gnupg > /dev/null
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS_ID/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS_ID $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null
        ;;
      dnf|yum)
        $PKG_MANAGER install -y -q dnf-plugins-core > /dev/null 2>&1 || true
        $PKG_MANAGER config-manager --add-repo https://download.docker.com/linux/$OS_ID/docker-ce.repo > /dev/null 2>&1
        $PKG_MANAGER install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
        ;;
    esac
    
    systemctl enable --now docker > /dev/null 2>&1
    ok "Docker installed and started"
  else
    ok "Docker already installed: $(docker --version)"
  fi

  # Create Dockerfile if not present
  info "Building CBUP Docker image..."
  
  mkdir -p "$INSTALL_DIR"
  cat > "$INSTALL_DIR/Dockerfile" << 'DOCKERFILE'
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install bun
RUN npm install -g bun

# Dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build
COPY . .
RUN bun run build

# Production
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/cbup.db"

RUN addgroup --system --gid 1001 cbup && adduser --system --uid 1001 cbup

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

RUN mkdir -p /app/data && chown -R cbup:cbup /app
USER cbup

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
DOCKERFILE

  # Create docker-compose.yml
  cat > "$INSTALL_DIR/docker-compose.yml" << YML
version: "3.8"

services:
  cbup:
    build: .
    container_name: cyber-brief-up
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - cbup-data:/app/data
      - cbup-logs:/app/logs
    environment:
      - DATABASE_URL=file:/app/data/cbup.db
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  cbup-data:
    driver: local
  cbup-logs:
    driver: local
YML

  # Build and start
  cd "$INSTALL_DIR"
  docker compose build --quiet 2>&1
  docker compose up -d 2>&1
  
  ok "CBUP is running in Docker on port $PORT"
}

# ─── Bare-Metal Install Path ──────────────────────────
install_bun() {
  step "Installing Bun runtime"
  
  if command -v bun &>/dev/null; then
    ok "Bun already installed: $(bun --version)"
    return
  fi

  info "Downloading Bun..."
  BUN_INSTALL="/usr/local"
  curl -fsSL https://bun.sh/install | BUN_INSTALL="$BUN_INSTALL" bash -s "bun-v1.2.2" > /dev/null 2>&1 \
    || curl -fsSL https://bun.sh/install | BUN_INSTALL="$BUN_INSTALL" bash > /dev/null 2>&1 \
    || die "Failed to install Bun"

  export PATH="$BUN_INSTALL/bin:$PATH"
  ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null || true
  ok "Bun installed: $(bun --version)"
}

install_prerequisites() {
  step "Installing system prerequisites"

  case "$PKG_MANAGER" in
    apt-get)
      apt-get update -qq
      apt-get install -y -qq curl git build-essential libssl-dev ca-certificates > /dev/null
      ;;
    dnf)
      dnf install -y -q curl git gcc gcc-c++ make openssl-devel ca-certificates > /dev/null 2>&1
      ;;
    yum)
      yum install -y -q curl git gcc make openssl-devel ca-certificates > /dev/null 2>&1
      ;;
  esac
  ok "System prerequisites installed"
}

clone_or_copy_repo() {
  step "Setting up application files"

  IS_UPDATE=$1
  CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

  if $IS_UPDATE; then
    info "Updating existing installation at $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    if [[ -d .git ]]; then
      git pull origin "$BRANCH" 2>&1 || warn "git pull failed — files may have been modified locally"
    fi
  elif [[ -f "$CURRENT_DIR/package.json" ]]; then
    info "Installing from local source ($CURRENT_DIR)..."
    if [[ "$CURRENT_DIR" != "$INSTALL_DIR" ]]; then
      rm -rf "$INSTALL_DIR"
      cp -r "$CURRENT_DIR" "$INSTALL_DIR"
    fi
  else
    REPO=$(ask "Git repository URL" "$REPO_URL")
    info "Cloning from $REPO (branch: $BRANCH)..."
    rm -rf "$INSTALL_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO" "$INSTALL_DIR" 2>&1 || die "Failed to clone repository"
  fi

  ok "Application files ready at $INSTALL_DIR"
}

install_dependencies() {
  step "Installing Node.js dependencies"
  
  cd "$INSTALL_DIR"

  info "Running bun install..."
  bun install 2>&1 | tail -3
  ok "Dependencies installed"
}

setup_database() {
  step "Setting up database"

  cd "$INSTALL_DIR"

  # Create data directory
  mkdir -p "$DATA_DIR"
  
  # Set DATABASE_URL
  export DATABASE_URL="file:$DATA_DIR/cbup.db"
  
  # Write .env for future use
  cat > "$INSTALL_DIR/.env" << ENV
DATABASE_URL="file:$DATA_DIR/cbup.db"
NODE_ENV=production
PORT=$PORT
ENV

  info "Pushing database schema..."
  bun run db:push 2>&1 | tail -3
  ok "Database initialized at $DATA_DIR/cbup.db"
}

build_application() {
  step "Building production bundle"
  
  cd "$INSTALL_DIR"

  info "Running next build (this may take a minute)..."
  bun run build 2>&1 | tail -5
  ok "Production build complete"
}

setup_systemd() {
  step "Setting up system service"

  USER_EXISTS=$(id -u cbup 2>/dev/null || echo "")

  if [[ -z "$USER_EXISTS" ]]; then
    useradd -r -s /usr/sbin/nologin -d "$INSTALL_DIR" cbup 2>/dev/null || true
    ok "Created system user: cbup"
  fi

  # Set permissions
  chown -R cbup:cbup "$INSTALL_DIR" 2>/dev/null || true
  chown -R cbup:cbup "$DATA_DIR" 2>/dev/null || true
  mkdir -p "$LOG_DIR" && chown cbup:cbup "$LOG_DIR"

  # Create systemd service
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" << SVC
[Unit]
Description=Cyber Brief Unified Platform
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=cbup
Group=cbup
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_URL=file:$DATA_DIR/cbup.db
ExecStart=$(which bun) run start
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/cbup.log
StandardError=append:$LOG_DIR/cbup-error.log

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR $DATA_DIR $LOG_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVC

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" 2>/dev/null
  ok "Systemd service created: ${SERVICE_NAME}.service"
}

setup_firewall() {
  step "Configuring firewall"

  if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
    ufw allow "$PORT/tcp" > /dev/null 2>&1
    ok "UFW rule added: port $PORT/tcp"
  elif command -v firewall-cmd &>/dev/null && systemctl is-active firewalld &>/dev/null; then
    firewall-cmd --permanent --add-port="$PORT/tcp" > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1
    ok "Firewalld rule added: port $PORT/tcp"
  elif command -v iptables &>/dev/null; then
    warn "iptables detected — manual firewall rule may be needed:"
    warn "  iptables -A INPUT -p tcp --dport $PORT -j ACCEPT"
  else
    warn "No firewall detected — port $PORT should be open by default"
  fi
}

start_service() {
  step "Starting CBUP"

  if $USE_DOCKER; then
    cd "$INSTALL_DIR"
    docker compose up -d 2>&1
  else
    systemctl start "$SERVICE_NAME" 2>&1
    sleep 2
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
      ok "CBUP is running!"
    else
      error "Service failed to start. Check logs:"
      error "  journalctl -u ${SERVICE_NAME} -n 50"
      error "  cat $LOG_DIR/cbup-error.log"
      return 1
    fi
  fi
}

# ─── Management CLI ───────────────────────────────────
install_cli() {
  step "Installing management CLI"

  cat > /usr/local/bin/cbup << 'CLI'
#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

INSTALL_DIR="/opt/cbup"
SERVICE_NAME="cbup"
DATA_DIR="/var/lib/cbup"
LOG_DIR="/var/log/cbup"
BACKUP_DIR="/var/backups/cbup"

usage() {
  cat <<HELP
${BOLD}Cyber Brief Unified Platform — Management CLI${NC}

Usage: cbup <command> [options]

${BOLD}Commands:${NC}
  start              Start the CBUP service
  stop               Stop the CBUP service
  restart            Restart the CBUP service
  status             Show service status and health
  logs [lines]       Tail service logs (default: 50 lines)
  update             Update to the latest version
  backup             Create a database backup
  restore <file>     Restore from a backup file
  reset-db           Reset the database (DESTRUCTIVE)
  shell              Open a shell in the app directory
  doctor             Run diagnostics checks
  uninstall          Remove CBUP completely

${BOLD}Examples:${NC}
  cbup start
  cbup logs 100
  cbup update
  cbup backup
  cbup doctor
HELP
}

cmd_start() {
  echo -e "${CYAN}[CBUP]${NC} Starting service..."
  if [[ -f "$INSTALL_DIR/docker-compose.yml" ]] && docker ps -a --format '{{.Names}}' | grep -q cyber-brief-up; then
    cd "$INSTALL_DIR" && docker compose up -d
  else
    systemctl start "$SERVICE_NAME"
  fi
  sleep 2
  cmd_status
}

cmd_stop() {
  echo -e "${CYAN}[CBUP]${NC} Stopping service..."
  if [[ -f "$INSTALL_DIR/docker-compose.yml" ]] && docker ps -a --format '{{.Names}}' | grep -q cyber-brief-up; then
    cd "$INSTALL_DIR" && docker compose down
  else
    systemctl stop "$SERVICE_NAME"
  fi
  echo -e "${GREEN}[CBUP]${NC} Service stopped."
}

cmd_restart() {
  echo -e "${CYAN}[CBUP]${NC} Restarting service..."
  cmd_stop
  sleep 1
  cmd_start
}

cmd_status() {
  echo -e "${BOLD}${CYAN}═══ Cyber Brief Unified Platform — Status ═══${NC}"
  echo ""

  # Service status
  if [[ -f "$INSTALL_DIR/docker-compose.yml" ]] && docker ps --format '{{.Names}}' | grep -q cyber-brief-up; then
    echo -e "  Service:     ${GREEN}Running (Docker)${NC}"
    cd "$INSTALL_DIR" && docker compose ps
  elif systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo -e "  Service:     ${GREEN}Running${NC}"
    echo -e "  Uptime:      $(systemctl show "$SERVICE_NAME" --property=ActiveEnterTimestamp | cut -d= -f2)"
  else
    echo -e "  Service:     ${RED}Stopped${NC}"
  fi

  # Version
  if [[ -f "$INSTALL_DIR/package.json" ]]; then
    VERSION=$(cd "$INSTALL_DIR" && node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
    echo -e "  Version:     $VERSION"
  fi

  # Port
  PORT="${PORT:-3000}"
  echo -e "  Port:        $PORT"

  # Database
  if [[ -f "$DATA_DIR/cbup.db" ]]; then
    DB_SIZE=$(du -h "$DATA_DIR/cbup.db" | cut -f1)
    echo -e "  Database:    ${GREEN}OK${NC} ($DB_SIZE)"
  else
    echo -e "  Database:    ${YELLOW}Not found${NC}"
  fi

  # Disk usage
  if [[ -d "$INSTALL_DIR" ]]; then
    DISK=$(du -sh "$INSTALL_DIR" 2>/dev/null | cut -f1)
    echo -e "  Disk Usage:  $DISK"
  fi

  # Last backup
  if [[ -d "$BACKUP_DIR" ]]; then
    LAST_BACKUP=$(ls -t "$BACKUP_DIR"/cbup-backup-*.db 2>/dev/null | head -1)
    if [[ -n "$LAST_BACKUP" ]]; then
      BACKUP_DATE=$(stat -c %y "$LAST_BACKUP" 2>/dev/null | cut -d. -f1)
      echo -e "  Last Backup: $BACKUP_DATE"
    fi
  fi

  echo ""
}

cmd_logs() {
  local lines="${1:-50}"
  if [[ -f "$INSTALL_DIR/docker-compose.yml" ]] && docker ps --format '{{.Names}}' | grep -q cyber-brief-up; then
    cd "$INSTALL_DIR" && docker compose logs --tail="$lines" -f
  else
    journalctl -u "$SERVICE_NAME" -n "$lines" --no-pager -f
  fi
}

cmd_update() {
  echo -e "${CYAN}[CBUP]${NC} Updating to the latest version..."
  
  cd "$INSTALL_DIR"

  # Backup before update
  cmd_backup
  
  if [[ -d .git ]]; then
    git fetch origin
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    if [[ "$LOCAL" == "$REMOTE" ]]; then
      echo -e "${GREEN}[CBUP]${NC} Already up to date."
      return
    fi
    git pull origin main
  else
    echo -e "${YELLOW}[CBUP]${NC} Not a git repo — cannot auto-update."
    echo -e "${YELLOW}[CBUP]${NC} Please manually update files in $INSTALL_DIR"
    return 1
  fi

  echo -e "${CYAN}[CBUP]${NC} Installing dependencies..."
  bun install

  echo -e "${CYAN}[CBUP]${NC} Pushing database schema..."
  DATABASE_URL="file:$DATA_DIR/cbup.db" bun run db:push

  echo -e "${CYAN}[CBUP]${NC} Building production bundle..."
  bun run build

  cmd_restart
  echo -e "${GREEN}[CBUP]${NC} Update complete!"
}

cmd_backup() {
  mkdir -p "$BACKUP_DIR"
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_file="$BACKUP_DIR/cbup-backup-${timestamp}.db"
  
  if [[ -f "$DATA_DIR/cbup.db" ]]; then
    cp "$DATA_DIR/cbup.db" "$backup_file"
    # Compress
    gzip -f "$backup_file"
    echo -e "${GREEN}[CBUP]${NC} Backup created: ${backup_file}.gz ($(du -h "${backup_file}.gz" | cut -f1))"
  else
    echo -e "${YELLOW}[CBUP]${NC} No database to backup."
  fi
  
  # Keep only last 30 backups
  cd "$BACKUP_DIR" && ls -t cbup-backup-*.db.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
}

cmd_restore() {
  local file="$1"
  if [[ -z "$file" ]]; then
    echo -e "${RED}[CBUP]${NC} Usage: cbup restore <backup-file>"
    echo -e "${YELLOW}[CBUP]${NC} Available backups:"
    ls -lh "$BACKUP_DIR"/cbup-backup-*.db.gz 2>/dev/null || echo "  (none found)"
    return 1
  fi

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}[CBUP]${NC} File not found: $file"
    return 1
  fi

  cmd_stop
  
  # Backup current before restoring
  cmd_backup

  # Restore
  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" > "$DATA_DIR/cbup.db"
  else
    cp "$file" "$DATA_DIR/cbup.db"
  fi

  cmd_start
  echo -e "${GREEN}[CBUP]${NC} Database restored from $file"
}

cmd_reset_db() {
  echo -e "${RED}${BOLD}[WARNING]${NC} This will DELETE all data and reset the database!"
  read -rp "Type 'RESET' to confirm: " confirm
  if [[ "$confirm" != "RESET" ]]; then
    echo "Cancelled."
    return
  fi

  cmd_stop
  rm -f "$DATA_DIR/cbup.db"
  cd "$INSTALL_DIR"
  DATABASE_URL="file:$DATA_DIR/cbup.db" bun run db:push
  cmd_start
  echo -e "${GREEN}[CBUP]${NC} Database has been reset."
}

cmd_shell() {
  cd "$INSTALL_DIR" && exec bash
}

cmd_doctor() {
  echo -e "${BOLD}${CYAN}═══ CBUP Doctor — Diagnostics ═══${NC}"
  echo ""

  local errors=0

  # Check service
  echo -n "  Service:      "
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo -e "${GREEN}Running${NC}"
  else
    echo -e "${RED}Not running${NC}"
    ((errors++))
  fi

  # Check bun
  echo -n "  Bun runtime:  "
  if command -v bun &>/dev/null; then
    echo -e "${GREEN}$(bun --version)${NC}"
  else
    echo -e "${RED}Not found${NC}"
    ((errors++))
  fi

  # Check database
  echo -n "  Database:     "
  if [[ -f "$DATA_DIR/cbup.db" ]]; then
    echo -e "${GREEN}OK ($(du -h "$DATA_DIR/cbup.db" | cut -f1))${NC}"
  else
    echo -e "${RED}Missing${NC}"
    ((errors++))
  fi

  # Check port
  echo -n "  Port $PORT:    "
  if command -v ss &>/dev/null; then
    if ss -tlnp | grep -q ":$PORT "; then
      echo -e "${GREEN}Listening${NC}"
    else
      echo -e "${YELLOW}Not bound${NC}"
      ((errors++))
    fi
  else
    echo -e "${YELLOW}Cannot check (ss not found)${NC}"
  fi

  # Check disk space
  echo -n "  Disk Space:   "
  local free_pct
  free_pct=$(df "$INSTALL_DIR" | awk 'NR==2 {printf "%d", $5}')
  if [[ "$free_pct" -lt 90 ]]; then
    echo -e "${GREEN}${free_pct}% used${NC}"
  else
    echo -e "${RED}${free_pct}% used — running low!${NC}"
    ((errors++))
  fi

  # Check memory
  echo -n "  Memory:       "
  local mem_avail
  mem_avail=$(free -m | awk 'NR==2 {printf "%dMB free / %dMB total", $7, $2}')
  if [[ $(free -m | awk 'NR==2 {print $7}') -gt 256 ]]; then
    echo -e "${GREEN}$mem_avail${NC}"
  else
    echo -e "${YELLOW}$mem_avail — low memory${NC}"
    ((errors++))
  fi

  # Check connectivity
  echo -n "  HTTP Health:  "
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" ]]; then
    echo -e "${GREEN}200 OK${NC}"
  else
    echo -e "${RED}$http_code${NC}"
    ((errors++))
  fi

  echo ""
  if [[ "$errors" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}All checks passed! ✓${NC}"
  else
    echo -e "${RED}${BOLD}$errors issue(s) found.${NC}"
  fi
  echo ""
}

cmd_uninstall() {
  echo -e "${RED}${BOLD}WARNING: This will completely remove Cyber Brief Unified Platform!${NC}"
  read -rp "Type 'UNINSTALL' to confirm: " confirm
  if [[ "$confirm" != "UNINSTALL" ]]; then
    echo "Cancelled."
    return
  fi

  echo -e "${CYAN}[CBUP]${NC} Stopping service..."
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload 2>/dev/null

  # Docker cleanup
  if [[ -f "$INSTALL_DIR/docker-compose.yml" ]]; then
    cd "$INSTALL_DIR" && docker compose down -v 2>/dev/null || true
  fi

  echo -e "${CYAN}[CBUP]${NC} Removing files..."
  rm -rf "$INSTALL_DIR"
  rm -rf "$LOG_DIR"
  rm -rf "$BACKUP_DIR"
  userdel cbup 2>/dev/null || true

  echo -e "${CYAN}[CBUP]${NC} Removing CLI..."
  rm -f /usr/local/bin/cbup

  echo -e "${GREEN}${BOLD}[CBUP]${NC} Cyber Brief Unified Platform has been completely removed."
  echo -e "${YELLOW}[CBUP]${NC} Note: Database at $DATA_DIR was preserved. Remove manually if desired:"
  echo -e "${YELLOW}[CBUP]${NC}   rm -rf $DATA_DIR"
}

case "${1:-}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  status)   cmd_status ;;
  logs)     cmd_logs "${2:-50}" ;;
  update)   cmd_update ;;
  backup)   cmd_backup ;;
  restore)  cmd_restore "${2:-}" ;;
  reset-db) cmd_reset_db ;;
  shell)    cmd_shell ;;
  doctor)   cmd_doctor ;;
  uninstall) cmd_uninstall ;;
  -h|--help|help|"") usage ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    usage
    exit 1
    ;;
esac
CLI

  chmod +x /usr/local/bin/cbup
  ok "Management CLI installed: cbup (run 'cbup --help')"
}

# ─── Uninstall ────────────────────────────────────────
uninstall() {
  if command -v cbup &>/dev/null; then
    cbup uninstall
  else
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload 2>/dev/null
    rm -rf "$INSTALL_DIR" "$LOG_DIR"
    rm -f /usr/local/bin/cbup
    echo -e "${GREEN}[CBUP]${NC} Uninstalled."
  fi
}

# ─── Summary ──────────────────────────────────────────
print_summary() {
  separator
  echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
  separator
  echo ""
  echo -e "  ${BOLD}Cyber Brief Unified Platform${NC} is now running on:"
  echo -e "  ${CYAN}  http://localhost:${PORT}${NC}"
  echo ""
  echo -e "  ${BOLD}Management commands:${NC}"
  echo -e "    cbup status     — Check service status"
  echo -e "    cbup logs       — View logs"
  echo -e "    cbup restart    — Restart service"
  echo -e "    cbup update     — Update to latest version"
  echo -e "    cbup backup     — Backup database"
  echo -e "    cbup doctor     — Run diagnostics"
  echo -e "    cbup --help     — All commands"
  echo ""
  echo -e "  ${BOLD}Files:${NC}"
  echo -e "    App:        $INSTALL_DIR"
  echo -e "    Database:   $DATA_DIR/cbup.db"
  echo -e "    Logs:       $LOG_DIR/"
  echo -e "    Backups:    $BACKUP_DIR/"
  echo ""
  if $USE_DOCKER; then
    echo -e "  ${BOLD}Docker:${NC}"
    echo -e "    cd $INSTALL_DIR && docker compose logs -f"
    echo ""
  else
    echo -e "  ${BOLD}Service:${NC}"
    echo -e "    systemctl ${SERVICE_NAME} {start|stop|restart|status}"
    echo -e "    journalctl -u ${SERVICE_NAME} -f"
    echo ""
  fi
  separator
}

# ─── Parse Args ───────────────────────────────────────
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --docker)       USE_DOCKER=true; shift ;;
      --port)         PORT="$2"; shift 2 ;;
      --yes|-y)       NONINTERACTIVE=true; shift ;;
      --uninstall)    UNINSTALL=true; shift ;;
      --branch)       BRANCH="$2"; shift 2 ;;
      --help|-h)      echo "Usage: $0 [--docker] [--port N] [--yes] [--uninstall] [--branch X]"; exit 0 ;;
      *)              die "Unknown option: $1" ;;
    esac
  done
}

# ─── Main ─────────────────────────────────────────────
main() {
  parse_args "$@"
  banner

  if $UNINSTALL; then
    check_root
    uninstall
    exit 0
  fi

  check_root
  check_os
  check_arch

  if $USE_DOCKER; then
    info "Install mode: Docker"
    check_existing || true
    install_docker
    install_cli
  else
    info "Install mode: Bare Metal (systemd)"
    IS_NEW=true
    check_existing || IS_NEW=false
    install_prerequisites
    install_bun
    clone_or_copy_repo $([[ "$IS_NEW" == "false" ]] && echo true || echo false)
    install_dependencies
    setup_database
    build_application
    setup_systemd
    setup_firewall
    start_service
    install_cli
  fi

  print_summary
}

main "$@"
