/**
 * Zod validation schemas for AI responses
 * Ensures AI-generated JSON matches expected structure before rendering
 */

import { z } from 'zod';

/**
 * Schema for chart filter object
 */
const ChartFiltersSchema = z.object({
  category: z.string().optional().default(''),
  platform: z.string().optional().default(''),
  instrument: z.string().optional().default(''),
  currency: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([])
});

/**
 * Schema for a single chart suggestion/configuration
 */
const ChartConfigSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  chartType: z.enum([
    'PieChart',
    'BarChart',
    'HorizontalBarChart',
    'RadialBar',
    'Treemap',
    'RadarChart',
    'AreaChart',
    'LineChart',
    'ComposedChart'
  ]),
  dataKey: z.enum([
    'category',
    'platform',
    'instrument',
    'symbol',
    'tags',
    'currency'
  ]),
  aggregationType: z.enum(['sum', 'count', 'avg']).optional().default('sum'),
  filters: ChartFiltersSchema.optional().default({
    category: '',
    platform: '',
    instrument: '',
    currency: '',
    tags: []
  }),
  size: z.enum(['small', 'medium', 'large']).optional().default('medium'),
  showGrid: z.boolean().optional().default(true)
});

/**
 * Schema for chart suggestions response (multiple charts)
 */
export const ChartSuggestionsSchema = z.object({
  suggestions: z.array(ChartConfigSchema).min(1).max(10)
});

/**
 * Schema for single chart response
 */
export const SingleChartSchema = ChartConfigSchema;

/**
 * Schema for rebalancing allocation response
 * Format: { "item1": percentage1, "item2": percentage2, ... }
 * All percentages must sum to 100
 */
export const RebalancingAllocationSchema = z.record(
  z.string(),
  z.number().min(0).max(100)
).refine(
  (data) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    return Math.abs(total - 100) < 0.1; // Allow small floating point errors
  },
  {
    message: 'Percentages must sum to 100%'
  }
);

/**
 * Validate chart suggestions response
 * @param {any} data - Data to validate
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const validateChartSuggestions = (data) => {
  try {
    const validated = ChartSuggestionsSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: `Validation failed: ${errorMessages}` 
      };
    }
    return { 
      success: false, 
      error: `Validation error: ${error.message}` 
    };
  }
};

/**
 * Validate single chart response
 * @param {any} data - Data to validate
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const validateSingleChart = (data) => {
  try {
    const validated = SingleChartSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: `Validation failed: ${errorMessages}` 
      };
    }
    return { 
      success: false, 
      error: `Validation error: ${error.message}` 
    };
  }
};

/**
 * Validate rebalancing allocation response
 * @param {any} data - Data to validate
 * @returns {{success: boolean, data?: any, error?: string}}
 */
export const validateRebalancingAllocation = (data) => {
  try {
    const validated = RebalancingAllocationSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: `Validation failed: ${errorMessages}` 
      };
    }
    return { 
      success: false, 
      error: `Validation error: ${error.message}` 
    };
  }
};

/**
 * Safe fallback chart configuration
 */
export const getFallbackChartConfig = () => ({
  title: 'גרף חדש',
  chartType: 'PieChart',
  dataKey: 'category',
  aggregationType: 'sum',
  filters: {
    category: '',
    platform: '',
    instrument: '',
    currency: '',
    tags: []
  },
  size: 'medium',
  showGrid: true
});

/**
 * Safe fallback chart suggestions
 */
export const getFallbackChartSuggestions = () => ({
  suggestions: [
    {
      title: 'פיזור לפי קטגוריות',
      chartType: 'PieChart',
      dataKey: 'category',
      aggregationType: 'sum',
      filters: {
        category: '',
        platform: '',
        instrument: '',
        currency: '',
        tags: []
      },
      size: 'medium',
      showGrid: true
    }
  ]
});
