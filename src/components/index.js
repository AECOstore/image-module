import React, { useState, useEffect } from "react";
import {Button, FormGroup, FormControlLabel, Checkbox} from '@mui/material'

const LBDviewer = (props) => {
  const { piral } = props
  const constants = piral.getData("CONSTANTS")

  const [images, setImages] = useState([])
  const [dataset, setDataset] = useState("")
  const [selection, setSelection] = useState([])
  const [height, setHeight] = useState(600)

  const [activeImages, setActiveImages] = useState([])

  async function getDistributions() {
    const project = piral.getData(constants.ACTIVE_PROJECT)

    const results = await piral.getResourcesByContentType(project, "https://www.iana.org/assignments/media-types/image/jpeg")
    setImages(results)
  }
  
  piral.on('store-data', ({ name, value }) => {
    if (name === constants.SELECTED_CONCEPTS) {
      const sel = value.map(item => item.references.filter((ref) => images.map(m => m.dUrl).includes(ref.document))).flat().map(i => i.identifier)
      setSelection(sel)
    }
  });

  async function onSelect(sel) {
    setSelection(sel)
    piral.setDataGlobal(constants.SELECTED_REFERENCES, [{activeDocument: images[0].dUrl, identifier: sel[0]}])
  }

  function setActive(data, dist) {
    setActiveImages(prev => {
      if (prev.includes(dist.dUrl)) {
        return prev.filter(item => item != dist.dUrl)
      } else {
        return [...prev, dist.dUrl]
      }
    })
  }


  return (
    <div>
      <div>
    <Button onClick={() => getDistributions()} >Get images in project</Button>
      </div>
      <FormGroup>
      {images.map(image => {
        return <FormControlLabel key={image.dUrl} control={<Checkbox onChange={(i) => setActive(i, image)}/>} label={image.dUrl} />
      })}
    </FormGroup>
      {(activeImages.length) ? (
        <div>
          {activeImages.map(image => {
            return <div>
          <img key={image} src={image} alt="test image"/>
          </div>
          })}
        </div>
      ) : (
        <div>
          <p style={{ paddingTop: "10%" }}>No images selected </p>
        </div>
      )}
    </div>
  );
};

export default LBDviewer;
