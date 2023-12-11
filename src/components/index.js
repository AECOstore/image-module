import React, { useState, useEffect } from "react";
import { Button, FormGroup, FormControlLabel, Checkbox } from '@mui/material'
import ReactImageAnnotate from "../adaptedModules/react-image-annotate";
import {v4} from 'uuid'

const LBDviewer = (props) => {
  const { piral } = props
  const constants = piral.getData("CONSTANTS")
  const [stateKey, setStateKey] = useState(v4());
  const [images, setImages] = useState([])
  const [dataset, setDataset] = useState("")
  const [selection, setSelection] = useState([])
  const [height, setHeight] = useState(600)

  const [selectedImage, setSelectedImage] = useState()

  async function getDistributions() {
    const results = await piral.getResourcesByContentType(piral, ["https://www.iana.org/assignments/media-types/image/jpeg"])
    
    setImages(results.map(i => {return {src: i.distribution, name: i.distribution.split("/").pop(), regions: []}}))
  }

  piral.on('store-data', ({ name, value }) => {
    if (name === constants.SELECTED_CONCEPTS) {
      const sel = value.map(item => item.references.filter((ref) => images.map(m => m.dUrl).includes(ref.document))).flat().map(i => i.identifier)
      setSelection(sel)
    }
  });

  async function onSelect(sel) {
    setSelection(sel)
    piral.setDataGlobal(constants.SELECTED_REFERENCES, [{ activeDocument: images[0].dUrl, identifier: sel[0] }])
  }

  function setActive(data, dist) {
    setSelectedImage(prev => {
      if (prev.includes(dist.dUrl)) {
        return prev.filter(item => item != dist.dUrl)
      } else {
        return [...prev, dist.dUrl]
      }
    })
  }

  async function handleNextImage(e) {
    console.log(`e`, e);
    if (selectedImage < images.length) {
      setSelectedImage((e) => e + 1);
    }
    setStateKey(v4());
  }

  async function handlePreviousImage(e) {
    console.log(`e`, e);
    if (selectedImage > 0) {
      setSelectedImage((e) => e - 1);
    }
    console.log(e.images[selectedImage]);
    setStateKey(v4());
  }

  return (
    <div>
      <Button onClick={getDistributions}>Get Images</Button>
      {(images.length) ? (
        <div>
                <ReactImageAnnotate
        hideHeader={true}
        enabledTools={["select", "create-box", "create-polygon"]}

        key={stateKey}
        selectedImage={selectedImage}
        onSelectRegion={(e) => console.log("region", e)}
        images={images}
        // regionClsList={allowedClasses}

        showTags={true}
        onExit={(e) => saveAll(e)}
        allowComments={true}
        onNextImage={handleNextImage}
        onPrevImage={handlePreviousImage}
        hideNext={selectedImage < images.length - 1 ? false : true}
        hidePrev={selectedImage === 0 || images.length < 2 ? true : false}

      />
      <Button
        variant="contained"
        color="primary"
        style={{ margin: 10 }}
        onClick={() => getAssociatedRegions(images[selectedImage])}
      >
        Get associated regions
      </Button>
      <Button
        variant="contained"
        color="primary"
        style={{ margin: 10 }}
       
      >
        Upload new image
      </Button>
        </div>
      ) : (
        <div>
          <p style={{ paddingTop: "10%" }}>No images selected </p>
        </div>
      )}
      
    </div>
  )

  // return (
  //   <div>
  //     <div>
  //   <Button onClick={() => getDistributions()} >Get images in project</Button>
  //     </div>
  //     <FormGroup>
  //     {images.map(image => {
  //       return <FormControlLabel key={image.dUrl} control={<Checkbox onChange={(i) => setActive(i, image)}/>} label={image.dUrl} />
  //     })}
  //   </FormGroup>
  //     {(selectedImage.length) ? (
  //       <div>
  //         {selectedImage.map(image => {
  //           return <div>
  //         <img key={image} src={image} alt="test image"/>
  //         </div>
  //         })}
  //       </div>
  //     ) : (
  //       <div>
  //         <p style={{ paddingTop: "10%" }}>No images selected </p>
  //       </div>
  //     )}
  //   </div>
  // );
};

export default LBDviewer;
