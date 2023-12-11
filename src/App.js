import React, { useState, useEffect, useRef } from "react";
import {
  StylesProvider,
  createGenerateClassName,
} from "@material-ui/core/styles";
import {
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  FormHelperText,
  Button,
} from "@material-ui/core";
import mime from "mime-types";
import ReactImageAnnotate from "./adaptedModules/react-image-annotate";
import {v4} from "uuid";
import {
  findReferenceEndpoints,
  getDistributionsByMediaType,
  getDatasetsOfPartial,
  createDistribution,
  createDataset
} from "consolid";
import short from "short-uuid";

function Plugin(props) {
  const { sharedProps, module, inactive } = props;
  const {
    selectedElements,
    setSelectedElements,
    datasets,
    projects,
    store,
    session,
    trigger,
  } = sharedProps;
  const [artefactRegistry, setArtefactRegistry] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [stateKey, setStateKey] = useState(v4());
  const [allowedClasses, setAllowedClasses] = useState([
    // "DamageArea",
    "Element",
  ]);
  const [enabledTools, setEnabledTools] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [writingResource, setWritingResource] = useState("");
  const [label, setLabel] = useState("");
  const [dataset, setDataset] = useState("CREATE_NEW");
  const project = projects[0];


  async function getAssociatedRegions() {
    let selection = selectedElements
      .map((thing) => thing.references)
      .flat()
      .filter((t) => t.datasets.includes(images[0].dataset))
      .map((i) => {
        try {
          return JSON.parse(i.id);
        } catch (error) {}
      })
      .filter((i) => i !== undefined);
    console.log(`selection`, selection);
    const imgs = images;

    const regions = [];
    for (const sel of selection) {
      regions.push({
        ...sel,
        // cls: creator,
        color: "#ff0000",
        id: v4(),
        highlighted: true,
        // tags: [art.global[0]],
        loaded: true,
      });
    }

    imgs[selectedImage].regions = regions;
    console.log(`imgs`, imgs);
    setImages(imgs);
    setStateKey(v4());
    // selectionArray.push(selection)
  }

  function prepareTurtleDistribution(data) {
    const formdata = new FormData()
    formdata.append("file", new Blob([data], {type: "text/turtle"}), "data.ttl")
    return formdata
  }

  async function saveAll(e) {
    try {
      const sel = []
      let sat = await findReferenceEndpoints([projects[0] + "local/"], session);
      sat = sat[0]
      const endpoint = sat + "/storage/reference";
      for (const image of e.images) {
        for (const region of image.regions) {
          console.log(`region.cls`, region.cls)
          if (!region.loaded) {
            const type = region.type;
            let saveString;
            if (type === "box") {
              saveString = {
                type,
                x: region.x,
                y: region.y,
                w: region.w,
                h: region.h,
                color: region.color,
              };
            } else {
              saveString = { type, points: region.points };
            }
            const thingId = short.generate()

            for (const el of selectedElements) {
              let url, alias

              // they are enriching something they have already a reference of themselves
              if (el.url.includes(sat)) {
                console.log("i am enriching my own data")
                url = el.url
                alias = []
              } else { // they are creating an element based on the selected things of someone else.
                console.log("i am enriching someone else's data")

                alias = [el.url]
                url = `${endpoint}/thing_${thingId}`

                // notify the original owner you created an alias
                if (region.cls !== "DamageArea") {
                  const end = el.url.split('/').slice(0, -1).join('/') + '/alias'
                  // switch alias and url 
                  const raw = {url: alias, alias: [url]}
                  console.log(`raw`, raw)
                  const reqOptions = {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(raw)
                  }
                  await session.fetch(end, reqOptions)
                }
              }

              if (region.cls === "DamageArea") {
                let dsUrl;
                const projectId = project.split("/")[
                  project.split("/").length - 2
                ];

                if (dataset == "CREATE_NEW") {
                  let l
                  if (label.length === 0) {
                    l = v4();
                  } else {
                    l = label
                  }
                  console.log(`l`, l)
                  dsUrl = await createDataset(
                    projectId,
                    { title: l, keywords: [] },
                    {},
                    session
                  );
                } else {
                  dsUrl = dataset;
                }
  
                const objectId = short.generate();
                const damageId = short.generate();
                const triples = `@prefix dot: <https://w3id.org/dot#> . <#${objectId}> dot:hasDamageArea <#${damageId}> .`;
                const raw = prepareTurtleDistribution(triples)
                const distUrl = await createDistribution(
                  projectId,
                  dsUrl,
                  raw,
                  {},
                  session
                );
                
                const semanticRef = {
                  url,
                  alias,
                  dataset: dsUrl,
                  distribution: distUrl,
                  id: distUrl + `#${objectId}`,
                  project: projects[0],
                };

                const requestOptionsSem = {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(semanticRef),
                  redirect: "follow",
                };
                
                await session.fetch(endpoint, requestOptionsSem);
              }

                // adding the image string
                const imageRef = {
                  url,
                  dataset: image.dataset,
                  distribution: image.src,
                  id: saveString,
                  project: projects[0],
                };

                
                if (region.cls !== "DamageArea") {
                  imageRef.alias = alias
                }
  
                const requestOptionsImg = {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(imageRef),
                  redirect: "follow",
                };
                const thing = await session.fetch(endpoint, requestOptionsImg).then(r => r.json());      
                sel.push(thing)        
            }
          }
        }
      }
      // setSelectedElements(sel)
    } catch (error) {
      console.log(`error`, error)
    }

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
    <div
      id={stateKey}
      style={{
        width: module.dimensions.w - 2,
        height: module.dimensions.h - 100,
      }}
    >
      {/* <form>
        <label for="cars">Dataset for Damage Registration: </label>
        <select
          name="cars"
          id="cars"
          style={{ marginLeft: 5 }}
          onChange={(e) => {
            console.log(`e.target.value`, e.target.value);
            setDataset(e.target.value);
          }}
        >
          <option value="CREATE_NEW">Create New</option>
          {data &&
            data.map((ds) => {
              return (
                <option key={ds.url} value={ds.url}>
                  {ds.title}
                </option>
              );
            })}
        </select>
      </form>
      {dataset === "CREATE_NEW" ? (
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      ) : (
        <></>
      )}
      <br /> */}
      {/* adapt events via MainLayout module (pass functions via Annotator component) */}
      <ReactImageAnnotate
      // hideSave={true}
      // hideSettings={true}
      // hideFullScreen={true}
      // hideClone={true}
      hideHeader={true}
      enabledTools={["select", "create-box", "create-polygon"]}

        key={stateKey}
        selectedImage={selectedImage}
        onSelectRegion={(e) => console.log("region", e)}
        images={images}
        regionClsList={allowedClasses}
        
        showTags={true}
        onExit={(e) => saveAll(e)}
        allowComments={true}
        onNextImage={handleNextImage}
        onPrevImage={handlePreviousImage}
        hideNext={selectedImage < images.length - 1 ? false : true}
        hidePrev={selectedImage === 0 || images.length < 2 ? true : false}
      />
      {/* <Button
          variant="contained"
          color="primary"
          style={{ margin: 10 }}
          onClick={() => getRegions(images[selectedImage])}
        >
          Get all zones
        </Button> */}
      <Button
        variant="contained"
        color="primary"
        style={{ margin: 10 }}
        onClick={() => getAssociatedRegions(images[selectedImage])}
      >
        Get associated regions
      </Button>

    </div>
  );
}
