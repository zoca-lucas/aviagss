// ============================================
// UTILITÁRIOS DE RESPOSTA
// ============================================

export function jsonResponse<T>(data: T, status: number = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(message: string, status: number = 400) {
  return jsonResponse({ error: message }, status);
}

export function unauthorizedResponse() {
  return errorResponse('Unauthorized', 401);
}

export function notFoundResponse() {
  return errorResponse('Not found', 404);
}
