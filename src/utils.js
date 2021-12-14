export const serialize = form =>
  Object.fromEntries(new FormData(form).entries())
