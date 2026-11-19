import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logos } from '../src/sesion/Logos';

describe('logos del acceso', () => {
  it('muestra las imágenes de Reset y Wanted', () => {
    render(<Logos />);
    for (const nombre of ['Reset', 'Wanted']) {
      const logo = screen.getByRole('img', { name: `Logo de ${nombre}` });
      expect(logo.tagName).toBe('IMG');
      expect(logo).toHaveAttribute('src', expect.stringMatching(new RegExp(`${nombre.toLowerCase()}.*\\.png$`)));
    }
  });
});
