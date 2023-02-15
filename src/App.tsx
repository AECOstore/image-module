import * as React from 'react'
import { PiletApi } from 'consolid-shell'
import Viewer from './components/'

const App = (props) => {
  const {piral}: {piral:PiletApi} = props
  const constants = piral.getData('CONSTANTS')
  
  return (
    <div id="viewer-module">
      {piral.getData(constants.ACTIVE_PROJECT) ? (
      <Viewer {...props}/>
      ) : (
        <div>
          <p>Please activate a project first</p>
        </div>
      )}
    </div>
  )
}

export default App