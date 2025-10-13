/**
 * Template function for generating WebView HTML content
 * Loads the HTML template and injects dynamic values
 */

import { Asset } from 'expo-asset';

interface MapViewerParams {
  svgData: string;
  initialScale: number;
}

/**
 * Generate HTML content for the map WebView
 * @param params - Dynamic values to inject into the template
 * @returns HTML string ready for WebView
 */
export const getMapViewerHtml = async (params: MapViewerParams): Promise<string> => {
  // Load the HTML template
  const htmlAsset = Asset.fromModule(require('./map-viewer.html'));
  await htmlAsset.downloadAsync();

  const response = await fetch(htmlAsset.uri);
  let htmlTemplate = await response.text();

  // Escape backticks and dollar signs in SVG data to prevent template literal issues
  const escapedSvgData = params.svgData
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  // Replace placeholders with actual values
  htmlTemplate = htmlTemplate
    .replace('{{SVG_DATA}}', escapedSvgData)
    .replace('{{INITIAL_SCALE}}', params.initialScale.toString());

  return htmlTemplate;
};
