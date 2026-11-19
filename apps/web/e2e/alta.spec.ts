import { expect, test } from '@playwright/test';

test('el admin entra, da de alta una marca y la ve en el consolidado', async ({ page }) => {
  const marca = `Bata ${Date.now()}`;
  await page.goto('/');
  await page.getByLabel('Correo').fill('e2e-admin@reset.com.pe');
  await page.getByLabel('Contraseña').fill('e2e-clave-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Nueva marca' }).click();
  await page.getByLabel('Nombre de la marca').fill(marca);
  await page.getByRole('button', { name: 'Seguir' }).click();
  await page.getByRole('button', { name: 'Crear sector' }).click();
  await page.getByLabel('Nombre del sector').fill(`Calzado ${Date.now()}`);
  await page.getByLabel('Categoría', { exact: true }).fill('calzado');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Seguir' }).click();
  await page.getByRole('button', { name: 'Agregar competidor' }).click();
  await page.getByLabel('Nombre del competidor').fill('Footloose');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Seguir' }).click();
  await page.getByRole('button', { name: 'Crear y dejar listo para medir' }).click();
  await expect(page.getByText('Listo. La primera vuelta corre cuando esté el motor de ejecución.')).toBeVisible();
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Consolidado' }).click();
  await expect(page.getByRole('link', { name: marca })).toBeVisible();
});
