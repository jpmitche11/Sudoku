

function Sudoku(){
    this.cells = []; //array of all cells on the board
    this.rows = []; 
    this.columns = []; 
    this.groups = [];
    
    for(var n=0; n<9; n++){
        this.rows.push([]);
        this.columns.push([]);
        this.groups.push([]);
    }
    
    for(var i=0; i<81; i++){
        
        var c = i%9;
        var r = Math.floor(i/9);        
        var g = Math.floor(r/3)*3 + Math.floor(c/3);
        
        var cell = new Cell();
        this.cells.push(cell);
        this.rows[r].push(cell);
        this.columns[c].push(cell);
        this.groups[g].push(cell);
        
    }
}



Sudoku.prototype = {
    /*
     * An array of 81 values, or string of 81 chars.  values should be from 1-9, or any non-int character to use as a spacer
     */    
    setState: function(vals){ 
        for(var i=0, c; c=this.cells[i]; i++){
            v = parseInt(vals[i]);
            if(!v){v = null;}
            c.setValue(v);
        }
    },
    
    //For each row/column/block
    forEachGroup: function(f){
        var groupTypes = [
            this.rows, this.columns, this.groups
        ];
        for(var g=0, groups; groups=groupTypes[g]; g++){
          //  console.log("Each Group Type: "+["row", "col", "block"][g]);
            for(var h=0, group; group=groups[h]; h++){
          //      console.log("Group: "+h);
                f.call(this, group);
            }
        }
    },

    
    forEachNTuple: function(n, list, f){
        
        var impl = function(i, n, inTuple){
            var limit = list.length - (n-1);
            for(; i<limit ; i++){
                var tuple = inTuple.concat(list[i]);
                if(n==1) f.call(this, list);
                else{
                    impl(i, n-1, tuple);
                }
            }
            
        };
        
        
        impl(0, n, []);
    },    
    
    
    /**
     * Check for solved cells. Cells with only one hint set.
     */
    updateSolvedCells: function(){
        var numUpdates = 0;
        
        for(var i=0,cell; cell=this.cells[i]; i++){
            if(!cell.value){
                var numHints = 0;
                var lastHint=null;
                for(var h=1; h<=9; h++){
                    if(cell.flags[h]){
                        numHints ++;
                        lastHint = h;
                    }
                }
                if(numHints == 1){
                    cell.setValue(lastHint, true);
                    numUpdates++;
                }
                
                
            }
        }
        return numUpdates;
    },
    
    
    
    /**
     * Eliminate all hints that conflict with solved cells.
     */
    updateHints: function(){
        var numUpdates = 0;
        this.forEachGroup(function(cells){
            
            for(var i=0,c1; c1=cells[i]; i++){
                //if cell's value is set, then unset all hints for that value;
                var value = c1.value;
                if(value){
                    for(var j=0, c2; c2=cells[j]; j++){
                        if(i !== j && !c2.value){
                            if(c2.flags[value]){
                                numUpdates++;
                            }
                            c2.flags[value] = false;
                        }
                    }
                }                
            }    
            
        });
        
        
        return numUpdates;
        
    },

  
    
    
    checkNakedPairs: function(){
        var numUpdates = 0;        
        this.forEachGroup(function(cells){
            
            //for each pair of cells c1, c2
            //c1 has 2 hints, c2 has same 2 hints
            // unmark hints for all other cells in group 
            for(var i=0, c1; c1 = cells[i]; i++){
                    var hints1 = c1.getHints();
                    
                    if(hints1.length == 2){
                          for(var j=i+1, c2; c2=cells[j]; j++){
                              var hints2 = c2.getHints();
                              
                              if(arrayEquals(hints1, hints2)){
                                  
                                  for(var k=0; k<9; k++){
                                      if(k!=i && k != j){
                                          numUpdates += cells[k].setHints(hints1, false);
                                      }
                                  }
                                  
                              }
                              
                          }
                    }
                    
                }
        });
        
          return numUpdates;
        
    },
    
    
    /**
     * Look for hidden singles. Cases where only one cell in a group has hint h
     */
    checkHiddenSingles: function(){
        // going to code this for n=1 for now
        numUpdates = 0;
        this.forEachGroup(function(cells){
            
            refreshGrid(this);
            t=0;
            for(var v=1; v<=9; v++){
                var valueCell=null, numMatched=0; var c=0;
                for(var i=0, cell; cell = cells[i]; i++){
                    if(!cell.value && cell.flags[v]){                        
                        valueCell = cell;
                        c=i;
                        numMatched++;
                        if(numMatched>1){
                            break;
                        }
                        
                    }                    
                }
                
                if(numMatched == 1){
               //     console.log("Update Cell: ",c, " to ", v);
                    valueCell.resetHints([v]);
                    numUpdates++;
                }
            }
                
        });
        return numUpdates;
        
    },
    
    
    
    checkHiddenTuples: function(){
        /**
         For each group
             for each unsolved tuple, c1, to cn | n=[2,3] (quads and up too expensive, not likely to find anything)
                 for each ntuple of hints in c1
                     If c2, c3 also contain those hints
                         If all other cells in group do not contain those hints
                             c1, to cn have the hidden tuple, eliminate hints not in ntuple hints
         
         
         
         */
    }
    


};


function Cell(){
    this.flags = []; // 1-9, true/false. True if that number is possible
    this.setValue(null);   
};  
Cell.prototype = {
    setValue: function(val, isSolvedValue){
        for(var i=1; i<=9; i++){
            this.flags[i] = (!val) || (i === val);
        }
        this.value = val;
        this.isSolvedValue = isSolvedValue;
    },
    
    setHints: function(hints, value){
        var numUpdates = 0;
        for(var i=0, len=hints.length; i<len; i++){
            if(this.flags[hints[i]] != value){
                numUpdates++;
            }
            this.flags[hints[i]] = value;
        }
        return numUpdates;
    },
    
    resetHints: function(hints){
        this.flags = [];
        for(var i=0, len=hints.length; i<len; i++){
            this.flags[hints[i]] = true;
        }  
    },
    
    
    
    getHints: function(){
        var hints = [];
        for(var i=1; i<=9; i++){
            if(this.flags[i]){
                hints.push(i);
            }
        }
        return hints;
    }

};

arrayEquals = function(a, b){
    if(a === b){
        return true;        
    }
    if(a.length != b.length){
        return false;
    }
    for(var i=0, len=a.length; i<len; i++){
        if(a[i] !== b[i]){
            return false;
        }
    }
    return true;
};


