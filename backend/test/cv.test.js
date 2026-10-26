
import { describe, expect, it } from 'vitest';
import { diagnoseDiseaseFromText } from '../src/services/cv.js';

describe('diagnoseDiseaseFromText', () => {
  it('returns a diagnosis object', async () => {
    const result = await diagnoseDiseaseFromText(
      'leaves turning brown with spots',
      'tomato'
    );

    expect(result).toBeDefined();
    expect(result.disease).toBeTruthy();
    expect(result.treatment).toBeDefined();
    expect(result.source).toBeTruthy();
  });

  it('returns valid severity and confidence fields', async () => {
    const result = await diagnoseDiseaseFromText(
      'yellow patches on leaves',
      'wheat'
    );

    expect(result.severity).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns an inconclusive result for an unknown crop', async () => {
    const result = await diagnoseDiseaseFromText('wilting', 'dragonfruit');

    expect(result.disease).toBeTruthy();
    expect(result.confidence).toBe(0);
  });

  it('handles an empty crop type gracefully', async () => {
    const result = await diagnoseDiseaseFromText(
      'black spots on fruit',
      ''
    );

    expect(result).toBeDefined();
    expect(result.disease).toBeTruthy();
    expect(result.source).toBeTruthy();
  });
});