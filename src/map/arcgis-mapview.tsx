import React, { useRef, useEffect, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import {ScatterplotLayer} from '@deck.gl/layers';
import SpatialReference from '@arcgis/core/geometry/SpatialReference.js';
import {DeckLayer} from '@deck.gl/arcgis';
import TileInfo from '@arcgis/core/layers/support/TileInfo.js';
import { deckglUSArecords } from '../helpers/map-records';
import { MIN_ZOOM, MapPlugin } from './arcgis-types';
export interface Extents {
  latitude: number,
  longitude: number,
  zoom: number,
  searchZoom: number,
  initialZoom: number,
}

interface Props {
  extents?: Extents,
  plugins?: MapPlugin[],
}

const ArcgisMapview: React.FC<Props> = ({  plugins = [],}) => {
  const mapRef = useRef(null);
  const [mapView, setMapView] = useState<MapView|undefined>(undefined);
  const [deckLayer, setDeckLayer] = useState<DeckLayer|undefined>(undefined);
  const allPlugins = [...plugins];

  useEffect(() => {
    if (mapRef.current) {
      console.log('@- setting map view: ');
      const deckLLayer = new DeckLayer({
        'deck.layers': [
          new ScatterplotLayer({
            data: deckglUSArecords,
            getPosition: d => d.position,
            getColor: [255, 0, 0],
            radiusMinPixels: 5
          })
        ],
        'deck.getCursor': ({ isDragging }) => (isDragging ? 'grabbing' : 'inherit'),
        'deck.getTooltip': ({ object }) => (object?.tooltip && {
          html: `<p>${object.tooltip}</p>`,
          style: {
            backgroundColor: '#fcfcfc',
            color: '#060606',
            fontSize: '1em',
            lineHeight: '0.3em',
            padding: '0 10px',
          },
        }),
      });

      // Create map
      const map = new Map({
        basemap: 'satellite',
        layers: [deckLLayer],
      });

      // Create view
      const view = new MapView({
        container: mapRef.current,
        map: map,
        constraints: {
          lods: TileInfo.create({
            spatialReference: SpatialReference.WGS84,
          }).lods,
          minZoom: MIN_ZOOM,
        },
        background: {
          color: [255, 252, 244, 0.5],
        },
      });
      allPlugins.forEach((plugin) => {
        plugin.extendMap?.(view, deckLayer);
      });
      setMapView(view);
      setDeckLayer(deckLLayer);
    }
  }, []);

  useEffect(() => {
    if (mapView) {
      console.log("@@ @arcgis-mapview | refreshing Map")
      // Check with plugins to update the maps Layers. If any plugin wants to update the layers
      // set the layers property on the map. This prevents excessive re-rendering of the map
      const pluginsWantingRerender = allPlugins
        .filter((p) => !!p.shouldRerender?.(mapView));
      if (pluginsWantingRerender.length > 0) {
        applyLayers(mapView);
      }
    }
  }, [allPlugins]);

  useEffect(() => {
    if (mapView) {
      mapView.when(() => {
        console.log('@ re-rendering map view')
/*         [].filter((p) => p.onChange)
          .forEach((plugin) => {
            plugin.onChange?.(mapView);
          }); */
      });
    }
  });

  return <div className="map-view" ref={mapRef} />;
};

const applyLayers = (
  mapView: MapView,
) => {
  const currDeckLayer = mapView?.map.layers.filter((layer) => 'deck' in layer).getItemAt(0);
  mapView.map.layers.removeMany([currDeckLayer]);
  mapView?.map.addMany([currDeckLayer], 0);
};

export default ArcgisMapview;
