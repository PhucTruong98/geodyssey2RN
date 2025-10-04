import React from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks';

export const D3WorldMap: React.FC = () => {
  const theme = useTheme();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: ${theme.colors.background};
            overflow: hidden;
        }

        .map-container {
            width: 100vw;
            height: 100vh;
        }

        .country {
            fill: #FFFFE0;
            stroke: #000000;
            stroke-width: 0.5;
            cursor: pointer;
            transition: fill 0.2s;
        }

        .country:hover {
            fill: #FFE4B5;
        }

        .ocean {
            fill: rgb(109, 204, 236);
        }
    </style>
</head>
<body>
    <div class="map-container">
        <svg id="world-map"></svg>
    </div>

    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
        // World map data will be loaded from our assets
        const width = window.innerWidth;
        const height = window.innerHeight;

        const svg = d3.select("#world-map")
            .attr("width", width)
            .attr("height", height);

        // Create ocean background
        svg.append("rect")
            .attr("class", "ocean")
            .attr("width", width)
            .attr("height", height);

        // Create group for countries with zoom behavior
        const g = svg.append("g");

        // Define projection and path generator
        const projection = d3.geoNaturalEarth1()
            .scale(width / 6.5)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Load world map data from our SVG
        async function loadWorldMap() {
            try {
                // We'll use a simple world topology data
                // For now, let's create a simple world map using natural earth data
                const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
                const countries = topojson.feature(world, world.objects.countries);

                g.selectAll(".country")
                    .data(countries.features)
                    .enter().append("path")
                    .attr("class", "country")
                    .attr("d", path)
                    .on("click", function(event, d) {
                        console.log("Country clicked:", d.properties.NAME);

                        // Zoom to country
                        const bounds = path.bounds(d);
                        const dx = bounds[1][0] - bounds[0][0];
                        const dy = bounds[1][1] - bounds[0][1];
                        const x = (bounds[0][0] + bounds[1][0]) / 2;
                        const y = (bounds[0][1] + bounds[1][1]) / 2;
                        const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
                        const translate = [width / 2 - scale * x, height / 2 - scale * y];

                        svg.transition()
                            .duration(750)
                            .call(
                                zoom.transform,
                                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
                            );
                    });

            } catch (error) {
                console.error("Failed to load world map data:", error);
                // Fallback: create a simple rectangle as placeholder
                g.append("rect")
                    .attr("x", width * 0.1)
                    .attr("y", height * 0.3)
                    .attr("width", width * 0.8)
                    .attr("height", height * 0.4)
                    .attr("fill", "#FFFFE0")
                    .attr("stroke", "#000000");
            }
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;

            svg.attr("width", newWidth).attr("height", newHeight);
            projection.scale(newWidth / 6.5).translate([newWidth / 2, newHeight / 2]);

            g.selectAll("path").attr("d", path);
        });

        loadWorldMap();
    </script>
    <script src="https://cdn.jsdelivr.net/npm/topojson@3"></script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          console.log('D3 Map Message:', event.nativeEvent.data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});