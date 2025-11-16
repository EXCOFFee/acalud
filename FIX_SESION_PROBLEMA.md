# 🔐 PROBLEMA: Sesión se pierde al recargar la página

## 🚨 Síntoma

Cuando el usuario recarga la página (F5), es **devuelto al login** automáticamente, aunque el token JWT esté guardado en `localStorage`.

---

## 🔍 Diagnóstico Realizado

### ✅ Elementos que SÍ funcionan:

1. **Token se guarda correctamente**:
   - Login exitoso guarda token en `localStorage` con clave `acalud_token`
   - Se puede verificar en DevTools → Application → Local Storage

2. **Endpoint de verificación existe**:
   - Backend tiene endpoint `GET /api/v1/auth/verify`
   - Requiere `JwtAuthGuard` (necesita token en header Authorization)
   - Devuelve: `{ valid: true, user: {...} }`

3. **Flujo de verificación implementado**:
   - `AuthContext.tsx` llama `checkAuth()` al montar
   - `checkAuth()` → `enhancedAuthService.verifyToken()`
   - `verifyToken()` → `httpClient.get('/auth/verify')`

---

## 🐛 Posibles Causas

### **Causa #1: Token no se carga en httpClient al iniciar**

**Archivo**: `src/services/http.service.ts`

```typescript
private loadAuthToken(): void {
  try {
    const token = localStorage.getItem('acalud_token'); // ✅ Busca token
    
    if (token) {
      this.authToken = token; // ✅ Guarda en memoria
      console.log('🔑 Token cargado'); 
    }
  } catch (error) {
    this.authToken = null;
  }
}
```

**Problema potencial**: El constructor de `HttpClient` llama `loadAuthToken()`, pero puede que se ejecute **antes** de que React monte y `localStorage` esté disponible.

---

### **Causa #2: Timing de verificación**

**Archivo**: `src/contexts/AuthContext.tsx`

```typescript
useEffect(() => {
  checkAuth(); // Se ejecuta al montar el componente
}, [checkAuth]);
```

**Flujo actual**:
1. App se monta
2. `AuthContext` se monta
3. `checkAuth()` se ejecuta
4. `httpClient` puede no tener token aún
5. GET `/auth/verify` falla sin token en header
6. Usuario es enviado a login

---

### **Causa #3: Respuesta del endpoint no coincide con tipo esperado**

**Archivo**: `src/services/enhanced-auth.service.ts` (línea 588)

```typescript
const response = await httpClient.get<{ valid: boolean; user: User }>('/auth/verify');
```

**Backend responde**:
```json
{
  "valid": true,
  "user": { ... }
}
```

Esto **debería funcionar**, pero hay que verificar que el tipo `User` coincida con lo que envía el backend.

---

### **Causa #4: CORS o preflight request bloqueado**

Si el navegador hace un preflight request (OPTIONS) antes del GET, y el backend no responde correctamente al OPTIONS, la petición fallará.

---

## 🔧 Soluciones Propuestas

### **Solución #1: Asegurar que httpClient cargue el token ANTES de verificar**

**Modificar**: `src/contexts/AuthContext.tsx`

```typescript
const checkAuth = useCallback(async (): Promise<void> => {
  try {
    dispatch({ type: 'AUTH_INIT_START' });
    
    // 🔑 FORZAR RECARGA DEL TOKEN DESDE LOCALSTORAGE
    const token = localStorage.getItem('acalud_token');
    if (token) {
      httpClient.setAuthToken(token); // Asegurar que httpClient tenga el token
      console.log('✅ Token restaurado en httpClient:', token.substring(0, 20) + '...');
    }
    
    if (!authService.isAuthenticated()) {
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
      return;
    }

    const verificationResult = await authService.verifyToken();
    
    if (verificationResult.valid && verificationResult.user) {
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: verificationResult.user });
    } else {
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
    }
  } catch (error: any) {
    console.error('❌ Error verificando token:', error);
    dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
  }
}, [authService]);
```

---

### **Solución #2: Agregar retry con delay**

El problema puede ser timing. Agregar un pequeño delay antes de verificar:

```typescript
const checkAuth = useCallback(async (): Promise<void> => {
  try {
    dispatch({ type: 'AUTH_INIT_START' });
    
    // ⏰ Esperar un tick para que localStorage esté disponible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const token = localStorage.getItem('acalud_token');
    if (!token) {
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
      return;
    }
    
    httpClient.setAuthToken(token);
    
    const verificationResult = await authService.verifyToken();
    // ... resto del código
  } catch (error: any) {
    console.error('Error:', error);
    dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
  }
}, [authService]);
```

---

### **Solución #3: Validar token localmente antes de llamar al backend**

En lugar de siempre llamar al backend, podríamos decodificar el JWT localmente y verificar si expiró:

```typescript
import jwtDecode from 'jwt-decode';

function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const now = Date.now() / 1000;
    return decoded.exp < now;
  } catch {
    return true;
  }
}

const checkAuth = useCallback(async (): Promise<void> => {
  try {
    const token = localStorage.getItem('acalud_token');
    
    if (!token) {
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
      return;
    }
    
    // ✅ Verificar expiración local primero
    if (isTokenExpired(token)) {
      console.log('🕒 Token expirado - limpiando sesión');
      localStorage.removeItem('acalud_token');
      dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
      return;
    }
    
    httpClient.setAuthToken(token);
    
    // Ahora sí verificar con backend
    const verificationResult = await authService.verifyToken();
    // ...
  } catch (error) {
    console.error('Error:', error);
    dispatch({ type: 'AUTH_INIT_SUCCESS', payload: null });
  }
}, [authService]);
```

---

## 🧪 Cómo Debuggear

### **Paso 1: Verificar que el token esté guardado**

Abrir DevTools (F12) → Application → Local Storage → `http://localhost:5173`

Buscar clave `acalud_token`. Debería tener un valor como:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Paso 2: Ver logs en consola del navegador**

Abrir DevTools (F12) → Console

Al recargar la página, buscar:
```
🚀 Servicio HTTP inicializado con URL: http://localhost:3001/api/v1
🔑 Token de autenticación cargado desde localStorage
🌐 Realizando petición GET a: http://localhost:3001/api/v1/auth/verify
```

### **Paso 3: Ver petición en Network tab**

DevTools → Network → Filtrar por "verify"

Verificar:
- **Request Headers**: ¿Tiene `Authorization: Bearer <token>`?
- **Response Status**: ¿200 OK o 401 Unauthorized?
- **Response Body**: ¿Qué devuelve el servidor?

### **Paso 4: Revisar logs del backend**

En la terminal donde corre el backend, buscar:
```
GET /api/v1/auth/verify
```

Ver si hay errores como:
- `Unauthorized` → Token no válido o no enviado
- `JwtExpiredError` → Token expirado
- `JsonWebTokenError` → Token malformado

---

## 🎯 Plan de Acción Ejecutado

1. ✅ **Forzar setAuthToken** en `httpClient` antes de verificar.
2. ✅ **Esperar la inicialización** de `enhancedAuthService` en `checkAuth()`.
3. ✅ **Limpiar token y header** en casos de error o token inválido.

---

## ✅ Implementación 2025-11-06

- `src/contexts/AuthContext.tsx` ahora espera a que `enhancedAuthService` inicialice antes de verificar credenciales.
- El token se lee únicamente desde `localStorage` y se inyecta en `httpClient` antes de llamar a `/auth/verify`.
- Se limpia el token almacenado y el header `Authorization` ante cualquier error o token inválido.
- Se documentó el estado final del fix y se actualizó este archivo a **RESUELTO**.

---

## 📝 Notas

- El problema era **sistemático**: siempre ocurría al recargar
- No era un problema del backend (endpoint funcionaba correctamente)
- Era un problema de **timing/secuencia** en el frontend
- La solución aplicada fue **forzar la carga del token** desde `localStorage` antes de verificar

---

**Fecha**: 2025-10-01  
**Estado**: ✅ RESUELTO  
**Prioridad**: 🔥 ALTA (bloquea toda la experiencia de usuario)
