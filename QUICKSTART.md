## 🚀 Быстрая установка из OpenCode

Если вы уже работаете в opencode, можно установить pinchtab MCP прямо отсюда!

### Вариант 1: Одной командой (если репозиторий на GitHub)

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/pinchtab/pinchtab-mcp-wrapper/main/install.sh)"
```

### Вариант 2: Из локальной копии (если код уже скачан)

Если у вас уже есть локальная копия репозитория:

```bash
cd /путь/к/pinchtab-mcp-wrapper && ./install.sh
```

Или прямо из текущей директории:

```bash
./install.sh
```

### Что делает установщик:

1. ✅ Проверяет зависимости (Docker, Node.js, npm)
2. ✅ Копирует/клонирует код в `~/.pinchtab-mcp-wrapper`
3. ✅ Устанавливает зависимости и собирает проект
4. ✅ Собирает Docker образ `pinchtab:local`
5. ✅ Создает wrapper скрипт
6. ✅ Настраивает OpenCode (создает/обновляет `~/.config/opencode/opencode.json`)
7. ✅ Создает инструкции для агента (`~/.config/opencode/AGENTS.md`)

### После установки:

**Важно: Полностью перезапустите OpenCode!**

```bash
# Закройте текущую сессию opencode
# Затем запустите заново:
opencode
```

### Проверка:

```
/status
```

Должно показать что-то вроде:
```
MCP Servers:
  ✓ pinchtab - local
```

### Тестирование:

```
открой https://mts.ru и сделай скриншот
```

Или используйте команды:
```
/browse https://example.com
/screenshot
```

---

## Ручная установка (если автоматика не сработала)

Если автоматический установщик не сработал, выполните шаги вручную:

### 1. Проверьте зависимости

```bash
docker --version
node --version
npm --version
```

### 2. Соберите проект

```bash
cd /root/pinchtab-mcp-wrapper  # или ваша директория
npm install
npm run build
```

### 3. Соберите Docker образ

```bash
docker build -f pinchtab.Dockerfile -t pinchtab:local .
```

### 4. Создайте wrapper скрипт

```bash
cat > run-mcp.sh << 'EOF'
#!/bin/bash
export PINCHTAB_MODE=docker
export PINCHTAB_TOKEN=opencode-browser-token-secure
export PINCHTAB_DOCKER_IMAGE=pinchtab:local
export DEFAULT_SNAPSHOT_FORMAT=compact
export DEFAULT_MAX_TOKENS=2500
export SCREENSHOT_DEFAULT_DELIVERY=base64
export LOG_LEVEL=info
exec node "$(dirname "$0")/dist/index.js"
EOF
chmod +x run-mcp.sh
```

### 5. Настройте OpenCode

Создайте или отредактируйте `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pinchtab": {
      "type": "local",
      "command": ["/путь/к/pinchtab-mcp-wrapper/run-mcp.sh"],
      "enabled": true
    }
  }
}
```

### 6. Перезапустите OpenCode

```bash
opencode
```

### 7. Проверьте

```
/status
открой https://example.com
```

---

## Устранение неполадок

### "Connection closed"

- Проверьте что Docker работает: `docker ps`
- Проверьте логи контейнера: `docker logs pinchtab`
- Убедитесь что порт 9867 свободен: `lsof -i :9867`

### "MCP error -32000"

- Перезапустите OpenCode полностью
- Проверьте конфигурацию: `cat ~/.config/opencode/opencode.json`

### Контейнер не запускается

```bash
# Остановите и удалите старый контейнер
docker stop pinchtab && docker rm pinchtab

# Перезапустите OpenCode
```

### Сбросить всё и начать заново

```bash
# Остановить контейнер
docker stop pinchtab && docker rm pinchtab

# Удалить установку
rm -rf ~/.pinchtab-mcp-wrapper

# Перезапустить установку
./install.sh
```
