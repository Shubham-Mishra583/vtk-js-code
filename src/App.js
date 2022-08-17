import React from 'react'
import {useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';

import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';
import vtkInteractiveOrientationWidget from '@kitware/vtk.js/Widgets/Widgets3D/InteractiveOrientationWidget';
import vtkAngleWidget from '@kitware/vtk.js/Widgets/Widgets3D/AngleWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import * as vtkMath from '@kitware/vtk.js/Common/Core/Math';
import vtkCubeAxesActor from '@kitware/vtk.js/Rendering/Core/CubeAxesActor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkURLExtract from '@kitware/vtk.js/Common/Core/URLExtract';
import '@kitware/vtk.js/Rendering/OpenGL/RenderWindow';
import '@kitware/vtk.js/Rendering/WebGPU/RenderWindow';


import './App.css';

const App = () => {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);
  // const inputRef = useRef(null);
  // const oW = useRef(null);

  useEffect(() => {
    if (!context.current) {
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
      });
  
      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      const reader = vtkSTLReader.newInstance();
      const mapper = vtkMapper.newInstance({ scalarVisibility: false });
      const actor = vtkActor.newInstance();
      
      actor.setMapper(mapper);
      mapper.setInputConnection(reader.getOutputPort());
      
      context.current = {
        fullScreenRenderer,
        renderWindow,
        renderer,               
        reader,
        actor,
        mapper,
      };

    }

  }, [vtkContainerRef]);

  const update = () => {
    const {renderWindow, renderer, actor} = context.current;
    const resetCamera = renderer.resetCamera;
    const render = renderWindow.render;
  
    renderer.addActor(actor);

    resetCamera();
    render();
}

  const handleFile = (event) => {
    
  document.querySelector('#input').style.display = 'none';
  // oW.current.style.display = 'block';
  document.querySelector('#oW').style.display = 'block';
  document.querySelector('#aW').style.display = 'block';

  const {reader} = context.current;  
  event.preventDefault();
  const dataTransfer = event.dataTransfer;
  const files = event.target.files || dataTransfer.files;
  if (files.length === 1) {
    const fileReader = new FileReader();
    fileReader.onload = function onLoad(e) {
      reader.parseAsArrayBuffer(fileReader.result);
      update();
    };
    fileReader.readAsArrayBuffer(files[0]);
  }
}

const orientationWidget = () =>{
  const {render, renderer, renderWindow} = context.current;
  console.log(render);
  function majorAxis(vec3, idxA, idxB) {
    const axis = [0, 0, 0];
    const idx = Math.abs(vec3[idxA]) > Math.abs(vec3[idxB]) ? idxA : idxB;
    const value = vec3[idx] > 0 ? 1 : -1;
    axis[idx] = value;
    return axis;
  }
  
  // ----------------------------------------------------------------------------
  // Standard rendering code setup
  // ----------------------------------------------------------------------------
  
  const axes = vtkAxesActor.newInstance();
  const orientationWidget = vtkOrientationMarkerWidget.newInstance({
    actor: axes,
    interactor: renderWindow.getInteractor(),
  });
  orientationWidget.setEnabled(true);
  orientationWidget.setViewportCorner(
    vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT
  );
  orientationWidget.setViewportSize(0.3);
  orientationWidget.setMinPixelSize(100);
  orientationWidget.setMaxPixelSize(300);
  
  // ----------------------------------------------------------------------------
  // Add context to 3D scene for orientation
  // ----------------------------------------------------------------------------
  
  const camera = renderer.getActiveCamera();
  
  // ----------------------------------------------------------------------------
  // Widget manager
  // ----------------------------------------------------------------------------
  
  const widgetManager = vtkWidgetManager.newInstance();
  widgetManager.setRenderer(orientationWidget.getRenderer());
  
  const widget = vtkInteractiveOrientationWidget.newInstance();
  widget.placeWidget(axes.getBounds());
  // widget.setBounds(axes.getBounds());
  widget.setPlaceFactor(1);
  
  const vw = widgetManager.addWidget(widget);
  
  // // Manage user interaction
  vw.onOrientationChange(({ up, direction, action, event }) => {
    const focalPoint = camera.getFocalPoint();
    const position = camera.getPosition();
    const viewUp = camera.getViewUp();
  
    const distance = Math.sqrt(
      vtkMath.distance2BetweenPoints(position, focalPoint)
    );
    camera.setPosition(
      focalPoint[0] + direction[0] * distance,
      focalPoint[1] + direction[1] * distance,
      focalPoint[2] + direction[2] * distance
    );
  
    if (direction[0]) {
      camera.setViewUp(majorAxis(viewUp, 1, 2));
    }
    if (direction[1]) {
      camera.setViewUp(majorAxis(viewUp, 0, 2));
    }
    if (direction[2]) {
      camera.setViewUp(majorAxis(viewUp, 0, 1));
    }
  
    orientationWidget.updateMarkerOrientation();
    widgetManager.enablePicking();
    console.log("Testing Orientaion");
    render();
  });
  
  renderer.resetCamera();
  widgetManager.enablePicking();
  render(); 
}

const angleWidget = () =>{
  
  const{reader, renderer} = context.current;
  const widgetManager = vtkWidgetManager.newInstance();
  const widget = vtkAngleWidget.newInstance();
  console.log(reader);
  widgetManager.setRenderer(renderer);
  widget.placeWidget(reader.getOutputData().getBounds());
  
  widgetManager.addWidget(widget);
  
  renderer.resetCamera();
  widgetManager.enablePicking();
  
  document.querySelector('.focus').addEventListener('click', () => {
    widgetManager.grabFocus(widget);
  });

  widget.getWidgetState().onModified(() => {
  document.querySelector('#angle').innerText = widget.getAngle();
  });
}

const cubeAxis = () =>{
  const{renderer,renderWindow, actor} = context.current;

  const userParams = vtkURLExtract.extractURLParameters();
  const cubeAxes = vtkCubeAxesActor.newInstance();
  cubeAxes.setCamera(renderer.getActiveCamera());
  cubeAxes.setDataBounds(actor.getBounds());
  renderer.addActor(cubeAxes);
  const apiSpecificRenderWindow = renderWindow.newAPISpecificView(
    userParams.viewAPI
  );
  renderWindow.addView(apiSpecificRenderWindow);
  // const container = document.createElement('div');
  const container = document.querySelector('.container"');
  document.querySelector('.main').appendChild(container);
  apiSpecificRenderWindow.setContainer(container);

// ----------------------------------------------------------------------------
// Capture size of the container and set it to the renderWindow
// ----------------------------------------------------------------------------

const { width, height } = container.getBoundingClientRect();
apiSpecificRenderWindow.setSize(width, height);

// ----------------------------------------------------------------------------
// Setup an interactor to handle mouse events
// ----------------------------------------------------------------------------

const interactor = vtkRenderWindowInteractor.newInstance();
interactor.setView(apiSpecificRenderWindow);
interactor.initialize();
interactor.bindEvents(container);

// ----------------------------------------------------------------------------
// Setup interactor style to use
// ----------------------------------------------------------------------------

interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());
}

  return (
    <div>
      <div className='main' ref={vtkContainerRef} />
      <input type="file" class="file" onChange = {(event) => handleFile(event)} id = 'input' style = {{position: 'absolute'}}/>
      <button id='oW' style = {{display: 'none', position: 'absolute'}} onClick = {orientationWidget}>Show Widget</button>
      <button id='aW' style = {{display: 'none', position: 'absolute', left : "300px"}} onClick = {angleWidget}>Angel Widget</button>

      <div className="anglebox" style = {{position: 'absolute', left : '600px'}}>
        <button className = 'focus'>Grap Focus</button>
        <p id='angle'>Angel Value</p>
      </div>

      <div className="container"></div>
    </div>
  )
}

export default App