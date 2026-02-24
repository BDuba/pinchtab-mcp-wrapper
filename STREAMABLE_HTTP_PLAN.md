# План миграции Pinchtab MCP Wrapper на Streamable HTTP (v0.5.0)

## Обзор

**Цель:** Добавить поддержку Streamable HTTP транспорта в дополнение к существующему stdio, сохранив обратную совместимость.

**Streamable HTTP** — новый стандарт транспорта MCP (Revision 2025-03-26), который заменяет устаревший HTTP+SSE подход и обеспечивает:
- Stateful и stateless режимы работы
- Более эффективную передачу данных
- Нативную поддержку streaming
- Улучшенную масштабируемость для облачных развертываний

---

## Текущая архитектура (v0.4.0)

```
┌─────────────────┐      stdio      ┌─────────────────────┐      HTTP      ┌─────────────┐
│   AI Agent      │◄────────────────►│  PinchtabMcpServer  │◄──────────────►│  Pinchtab   │
│ (Claude, etc)   │                  │  (StdioServerTransport)              │   Browser   │
└─────────────────┘                  └─────────────────────┘                └─────────────┘
```

**Компоненты:**
- `PinchtabMcpServer` — MCP сервер с `StdioServerTransport`
- `PinchtabClient` — HTTP клиент для Pinchtab API
- 14 инструментов (thin + macro)
- Поддержка Docker/external/auto режимов

---

## Целевая архитектура (v0.5.0)

```
┌─────────────────┐     stdio/HTTP    ┌─────────────────────┐     HTTP      ┌─────────────┐
│   AI Agent      │◄─────────────────►│  PinchtabMcpServer  │◄─────────────►│  Pinchtab   │
│ (Claude, etc)   │                   │  (Transport Agnostic)               │   Browser   │
└─────────────────┘                   └─────────────────────┘               └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
            ┌───────▼────────┐      ┌─────────▼──────────┐    ┌────────▼───────┐
            │StdioServerTransport│   │StreamableHTTPServerTransport│  │SSEServerTransport│
            │   (legacy)      │      │   (recommended)     │    │  (deprecated)  │
            └─────────────────┘      └─────────────────────┘    └────────────────┘
```

---

## Фазы реализации

### Фаза 1: Подготовка и обновление зависимостей

**Задачи:**
1. **Обновить MCP SDK** до версии с поддержкой Streamable HTTP
   - Текущая: `^1.0.0`
   - Целевая: `^1.5.0` (или актуальная с Streamable HTTP)
   
2. **Проверить breaking changes** в новой версии SDK
   - Проверить изменения в `Server` классе
   - Проверить изменения в схемах запросов/ответов
   - Обновить типы если необходимо

3. **Обновить TypeScript** при необходимости
   - Проверить совместимость с новым SDK

**Файлы для изменения:**
- `package.json` — обновить версию `@modelcontextprotocol/sdk`
- `package-lock.json` — перегенерировать

**Ожидаемые трудности:**
- Возможные изменения в API SDK
- Необходимость адаптации типов

---

### Фаза 2: Рефакторинг транспортного слоя

**Задачи:**

1. **Создать абстракцию транспорта**
   ```typescript
   // src/transports/types.ts
   export interface TransportConfig {
     type: 'stdio' | 'streamable-http' | 'sse';
     port?: number;
     host?: string;
     path?: string;
     cors?: CorsConfig;
   }
   
   export interface Transport {
     connect(server: Server): Promise<void>;
     close(): Promise<void>;
   }
   ```

2. **Создать фабрику транспортов**
   ```typescript
   // src/transports/factory.ts
   export class TransportFactory {
     static create(config: TransportConfig): Transport {
       switch (config.type) {
         case 'stdio':
           return new StdioTransport();
         case 'streamable-http':
           return new StreamableHTTPTransport(config);
         case 'sse':
           return new SSETransport(config);
         default:
           throw new Error(`Unknown transport: ${config.type}`);
       }
     }
   }
   ```

3. **Реализовать Streamable HTTP транспорт**
   ```typescript
   // src/transports/streamable-http.ts
   import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
   
   export class StreamableHTTPTransport implements Transport {
     private transport: StreamableHTTPServerTransport;
     private server?: http.Server;
     
     constructor(config: TransportConfig) {
       // Инициализация
     }
     
     async connect(mcpServer: Server): Promise<void> {
       // Создание HTTP сервера
       // Подключение StreamableHTTPServerTransport
     }
     
     async close(): Promise<void> {
       // Graceful shutdown
     }
   }
   ```

4. **Обновить PinchtabMcpServer**
   - Убрать прямую зависимость от `StdioServerTransport`
   - Использовать фабрику транспортов
   - Добавить метод `setTransport()`

**Файлы для создания:**
- `src/transports/types.ts` — интерфейсы
- `src/transports/factory.ts` — фабрика
- `src/transports/stdio.ts` — обертка для stdio
- `src/transports/streamable-http.ts` — Streamable HTTP реализация
- `src/transports/sse.ts` — SSE (для обратной совместимости)

**Файлы для изменения:**
- `src/index.ts` — рефакторинг PinchtabMcpServer
- `src/config.ts` — добавить конфигурацию транспорта

---

### Фаза 3: Конфигурация и окружение

**Задачи:**

1. **Добавить переменные окружения**
   ```bash
   # Transport configuration
   MCP_TRANSPORT=stdio                    # stdio | streamable-http | sse
   MCP_HTTP_PORT=3000                     # Port for HTTP transports
   MCP_HTTP_HOST=0.0.0.0                  # Host for HTTP transports
   MCP_HTTP_PATH=/mcp                     # Endpoint path
   
   # Security
   MCP_AUTH_TYPE=none                     # none | bearer | api-key
   MCP_AUTH_TOKEN=secret-token            # Auth token for HTTP mode
   MCP_ALLOWED_ORIGINS=*                  # CORS origins
   
   # Session management (for stateful mode)
   MCP_SESSION_TIMEOUT=3600               # Session timeout in seconds
   MCP_ENABLE_SESSIONS=true               # Enable stateful sessions
   ```

2. **Обновить конфигурацию**
   ```typescript
   // src/config.ts
   export interface Config {
     // ... existing config
     
     // Transport
     transport: 'stdio' | 'streamable-http' | 'sse';
     httpPort: number;
     httpHost: string;
     httpPath: string;
     
     // Auth
     authType: 'none' | 'bearer' | 'api-key';
     authToken?: string;
     allowedOrigins: string[];
     
     // Sessions
     sessionTimeout: number;
     enableSessions: boolean;
   }
   ```

3. **Добавить валидацию конфигурации**
   - Валидация порта (1-65535)
   - Валидация auth конфигурации
   - Валидация CORS origins

**Файлы для изменения:**
- `src/config.ts` — добавить новые параметры
- `.env.example` — пример конфигурации

---

### Фаза 4: Безопасность и авторизация

**Задачи:**

1. **Реализовать middleware авторизации**
   ```typescript
   // src/transports/auth.ts
   export function createAuthMiddleware(config: AuthConfig) {
     return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
       // Bearer token validation
       // API key validation
       // CORS handling
     };
   }
   ```

2. **Поддержка режимов авторизации**
   - `none` — без авторизации (только для локальной разработки)
   - `bearer` — Bearer token в заголовке Authorization
   - `api-key` — API key в заголовке или query параметре

3. **CORS конфигурация**
   - Настраиваемые allowed origins
   - Preflight запросы
   - Credentials support

4. **Rate limiting (опционально)**
   - Простое rate limiting по IP
   - Конфигурируемые лимиты

**Файлы для создания:**
- `src/transports/auth.ts` — авторизация
- `src/transports/cors.ts` — CORS middleware
- `src/transports/rate-limit.ts` — rate limiting

---

### Фаза 5: Session Management

**Задачи:**

1. **Stateful режим** (по умолчанию для Streamable HTTP)
   - Создание сессий при подключении
   - Хранение состояния сессии
   - Session timeout
   - Cleanup неактивных сессий

2. **Stateless режим** (опционально)
   - Каждый запрос независим
   - Нет хранения состояния
   - Подходит для serverless

3. **Session store**
   ```typescript
   // src/transports/session.ts
   export interface SessionStore {
     create(): Session;
     get(id: string): Session | undefined;
     delete(id: string): void;
     cleanup(): void;
   }
   ```

**Файлы для создания:**
- `src/transports/session.ts` — управление сессиями
- `src/transports/session-memory.ts` — in-memory хранилище

---

### Фаза 6: Обновление Docker и развертывания

**Задачи:**

1. **Обновить Dockerfile**
   ```dockerfile
   # Добавить expose порта для HTTP
   EXPOSE 3000
   
   # Health check для HTTP
   HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
     CMD curl -f http://localhost:3000/health || exit 1
   ```

2. **Обновить Docker Compose**
   ```yaml
   services:
     pinchtab-mcp:
       ports:
         - "${MCP_HTTP_PORT:-3000}:3000"
       environment:
         - MCP_TRANSPORT=streamable-http
         - MCP_HTTP_PORT=3000
         - MCP_AUTH_TYPE=bearer
         - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
   ```

3. **Добавить docker-compose.http.yml**
   - Отдельный compose файл для HTTP режима
   - Reverse proxy (nginx/traefik) опционально
   - SSL/TLS termination

4. **Обновить install.sh**
   - Добавить опцию `--http`
   - Генерация токена для HTTP режима
   - Настройка фаервола при необходимости

**Файлы для изменения:**
- `Dockerfile` — добавить EXPOSE и healthcheck
- `docker-compose.yml` — добавить порт
- `install.sh` — поддержка HTTP режима

---

### Фаза 7: Логирование и мониторинг

**Задачи:**

1. **Адаптировать логирование для HTTP**
   - В HTTP режиме логи могут идти в stdout
   - В stdio режиме — в stderr (текущее поведение)
   - Request logging middleware

2. **Health check endpoint**
   ```typescript
   // /health endpoint для HTTP транспорта
   app.get('/health', (req, res) => {
     res.json({ 
       status: 'ok', 
       transport: 'streamable-http',
       version: '0.5.0'
     });
   });
   ```

3. **Metrics (опционально)**
   - Prometheus metrics endpoint
   - Request count, latency
   - Active sessions count

**Файлы для изменения:**
- `src/logger.ts` — поддержка разных выходов
- `src/transports/streamable-http.ts` — добавить /health

---

### Фаза 8: Тестирование

**Задачи:**

1. **Unit тесты**
   - Тесты для фабрики транспортов
   - Тесты для авторизации
   - Тесты для session management

2. **Integration тесты**
   - Тесты stdio транспорта (существующие)
   - Тесты Streamable HTTP транспорта
   - Тесты переключения транспортов

3. **E2E тесты**
   - Полный цикл: клиент -> HTTP -> MCP сервер -> Pinchtab
   - Тесты безопасности (auth, CORS)

4. **Performance тесты**
   - Нагрузочное тестирование HTTP режима
   - Сравнение latency stdio vs HTTP

**Файлы для создания:**
- `tests/unit/transports/` — тесты транспортов
- `tests/integration/streamable-http.test.ts`
- `tests/e2e/http-mode.e2e.test.ts`

---

### Фаза 9: Документация

**Задачи:**

1. **Обновить README.md**
   - Описание Streamable HTTP режима
   - Сравнение транспортов (stdio vs HTTP)
   - Примеры конфигурации
   - Безопасность и best practices

2. **Создать HTTP_GUIDE.md**
   - Подробное руководство по HTTP режиму
   - Настройка reverse proxy
   - SSL/TLS
   - Масштабирование

3. **Обновить CHANGELOG.md**
   - Все изменения v0.5.0
   - Breaking changes
   - Migration guide

4. **API Documentation**
   - OpenAPI spec для HTTP endpoints
   - Примеры запросов/ответов

**Файлы для создания:**
- `docs/HTTP_GUIDE.md`
- `docs/API.md`
- `docs/MIGRATION_v0.5.md`

---

### Фаза 10: Релиз

**Задачи:**

1. **Подготовка к релизу**
   - Финальное тестирование
   - Обновление версии в package.json
   - Обновление версии в коде сервера

2. **GitHub Release**
   - Release notes
   - Docker image
   - NPM пакет (если публикуется)

3. **Обновление install.sh**
   - Поддержка v0.5.0
   - Опция --http

---

## Технические детали

### Новые зависимости

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.5.0",
    "zod": "^3.22.4"
  },
  "optionalDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21"
  }
}
```

### Структура файлов (новые)

```
src/
├── transports/
│   ├── types.ts          # Интерфейсы транспортов
│   ├── factory.ts        # Фабрика транспортов
│   ├── stdio.ts          # Stdio транспорт
│   ├── streamable-http.ts # Streamable HTTP
│   ├── sse.ts            # SSE (legacy)
│   ├── auth.ts           # Авторизация
│   ├── cors.ts           # CORS middleware
│   ├── session.ts        # Session management
│   └── rate-limit.ts     # Rate limiting
docs/
├── HTTP_GUIDE.md         # HTTP режим
├── API.md                # API документация
└── MIGRATION_v0.5.md     # Миграция
```

### Breaking Changes

1. **Минимальная версия Node.js** может потребоваться >= 18.17.0
2. **Новые обязательные переменные окружения** для HTTP режима:
   - `MCP_AUTH_TOKEN` (если auth_type=bearer)
3. **Изменение поведения логирования** в HTTP режиме

### Backward Compatibility

- Все существующие инструменты работают без изменений
- Stdio режим остается режимом по умолчанию
- Все существующие переменные окружения продолжают работать

---

## Преимущества Streamable HTTP

1. **Облачные развертывания** — проще деплоить на AWS/GCP/Azure
2. **Масштабируемость** — load balancing, multiple instances
3. **Удаленный доступ** — AI агенты могут подключаться удаленно
4. **Serverless** — поддержка stateless режима для Lambda/Functions
5. **Web-интерфейсы** — возможность создания веб-UI поверх MCP

---

## Риски и смягчение

| Риск | Вероятность | Влияние | Смягчение |
|------|-------------|---------|-----------|
| Breaking changes в SDK | Средняя | Высокое | Пинить версию SDK, тщательное тестирование |
| Уязвимости безопасности | Средняя | Высокое | Обязательная авторизация, CORS, rate limiting |
| Производительность HTTP | Низкая | Среднее | Benchmarking, оптимизация, кэширование |
| Сложность конфигурации | Средняя | Низкое | Хорошая документация, reasonable defaults |

---

## Оценка времени

| Фаза | Оценка | Приоритет |
|------|--------|-----------|
| 1. Обновление зависимостей | 2 часа | Обязательно |
| 2. Рефакторинг транспортов | 8 часов | Обязательно |
| 3. Конфигурация | 4 часа | Обязательно |
| 4. Безопасность | 6 часов | Обязательно |
| 5. Session Management | 4 часа | Обязательно |
| 6. Docker | 3 часа | Обязательно |
| 7. Логирование | 2 часа | Обязательно |
| 8. Тестирование | 8 часов | Обязательно |
| 9. Документация | 4 часов | Обязательно |
| 10. Релиз | 2 часа | Обязательно |
| **Итого** | **43 часа** | |

---

## Следующие шаги

1. Создать ветку `feature/streamable-http`
2. Начать с Фазы 1 (обновление зависимостей)
3. Параллельно исследовать SDK API
4. Создать proof-of-concept Streamable HTTP транспорта
5. Поэтапное тестирование каждой фазы

---

## Дополнительные возможности (v0.6.0+)

- WebSocket транспорт для real-time коммуникации
- gRPC транспорт для high-performance сценариев
- Redis session store для distributed deployments
- OAuth2 / OIDC интеграция
- Metrics и мониторинг (Prometheus/Grafana)
