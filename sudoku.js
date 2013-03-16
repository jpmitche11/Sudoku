/**
Sudoku controller class
**/
function Sudoku($scope, $log){
    
    _.extend($scope, {
        //Arrays used to organize the sudoku board
        cells: [], //contains all 81 cells ordered from left to right, top to bottom
        rows: [], 
        columns: [], 
        groups: [], //contains the 3x3 squares of cells                
        iteration:0,
        benchmarks: Sudoku.benchmarks,
        init: function(){
            //delete old puzzle data if any
            this.rows = [];
            this.columns = [];
            this.groups = [];                        
            this.subGroups = [];
            this.cells = [];
            this.iteration = 0;
            this.solved = false;


             //create all subgroups - 3 cells in a row or column that belong to a group            
            //54 sub groups - 3 for each of the 9 rows and 9 columns
            /*for(var n=0; n<54; n++){
                var rowCol = Math.floor(n/3);                
                this.subGroups[rowCol] = {
                    cells:[],
                    rowCol: this.rows[rowCol],
                    group: this.groups[i%3+3*Math.floor(i/9)]
                };
                this.subGroups[27+rowCol] = {
                    cells:[],
                    rowCol: this.columns[rowCol],
                    group: null
                };
            }*/
            //create all subgroups - 3 cells in a row or column that belong to a group            
            //54 sub groups - 3 for each of the 9 rows and 9 columns
            for(var n=0; n<54; n++){               
                this.subGroups[n] = {
                    cells:[],
                    rowCol: null,
                    block: null
                };
            }
            
            for(var n=0; n<9; n++){
                //create arrays that will hold groups of cells
                this.rows.push([]);
                this.columns.push([]);
                this.groups.push([]);
            }
           
           
            
            //create all 81 cells(9x9) and put each cell into the correct row, column, and group
            for(var i=0; i<81; i++){                
                var c = i%9;
                var r = Math.floor(i/9);        
                var g = Math.floor(r/3)*3 + Math.floor(c/3);
                
                var cell = new Cell({
                    row:r,
                    group:g,
                    column:c
                });
                this.cells.push(cell);
                this.rows[r].push(cell);
                this.columns[c].push(cell);
                this.groups[g].push(cell);

                

                var sgRow = Math.floor(i/3)    
                var sgCol = 27+Math.floor(i/27) + 3*i%9;

                this.subGroups[sgRow].cells.push(cell);
                this.subGroups[sgRow].rowCol = this.rows[r];
                this.subGroups[sgRow].block = this.groups[g];

                this.subGroups[sgCol].cells.push(cell);
                this.subGroups[sgCol].rowCol = this.columns[c];
                this.subGroups[sgCol].block = this.groups[g];
                
            }

        },
        logIteration: function(action){            
            //$log.info( "Iteration "+action.iteration+": "+action.desc+"("+action.count+")");
        },
        handleCellClick: function($event, cell){
            if($event.ctrlKey){
                var v = cell.value;
                cell.setValue(null);
                cell.resetHints([v]);
            }
        },
        handleHintClick: function($event, cell, h){
            if($event.ctrlKey){
                cell.setValue(h);
            }
            else if($event.altKey){
                cell.resetHints([h]);
            }
            else if($event.shiftKey){
                cell.setValue(null);
                cell.setHint(h, false);
            }
            else{
                cell.toggleHint(h);
            }
        },

        benchmark: function () {
            for (var i = 0, l = this.benchmarks.length; i < l; i++) {                
                this.loadPuzzle(this.benchmarks[i]);
                this.solvePuzzle();
            }
        },
        loadPresetPuzzle: function(p){
            this.inputPuzzleStr=p;
            this.loadPuzzle(p);
        },
        loadPuzzle: function(puzzleStr){
            this.init();
            
            var vals = puzzleStr.replace(/\n/g, "");
            
            for(var i=0, c; c=this.cells[i]; i++){
                v = parseInt(vals[i]); 
                if(!v){v = null;}
                c.setValue(v);
            }

            $log.info("Loaded puzzle: " + puzzleStr);
        },
        
        solvePuzzle: function(){         
            //TODO: Prevent long running loop   
            while(this.iterateSolver()){}
            if(this.solved){
                $log.info("Solved in "+this.iteration+" iterations");
            }
            else{
                $log.info("Could not solve");   
            }
        },
        iterateSolver: function(noLogging){
            var done = this.updateHints();
            this.numUpdates = 0;
            this.iteration++;
            
            if(done){
                this.solved = true;
                this.logIteration({desc: "Finished", count: 0, iteration:this.iteration});
                return;
            }
            
            var algorithms = [                              
                  {f: this.updateCellValues, desc: "Find Naked Singles"},
                  {f: this.checkNakedTuples, desc: "Find Naked Doubles/Triples"},
                  {f: this.checkHiddenSingles, desc: "Find Hidden Singles"},
                  {f: this.checkHiddenTuples, desc: "Find Hidden Doubles/Triples"},
                  {f: this.checkIntersections, desc: "Find Intersections"}
              ];
            _.every(algorithms, function(algo){
                algo.f.call(this);
                if(this.numUpdates > 0){
                    this.logIteration({desc: algo.desc, count: this.numUpdates, iteration:this.iteration});
                    return false;
                }
                return true;
            }, this);
            
            if(this.numUpdates == 0 ){
                this.logIteration({desc: "No progress made", count: 0, iteration:this.iteration});               
            }
            this.updateHints();
            return this.numUpdates;
        },
        
        
        /**
         * Eliminate all hints that conflict with solved cells. 
         */
        updateHints: function(){
            var numUnsolvedCells=0;
            this.forEachGroup(function(cells){  //For each row, column, block
                for(var i=0,c1; c1=cells[i]; i++){
                    var value = c1.value;
                    if(value){                        
                        for(var j=0, c2; c2=cells[j]; j++){ //For each solved/unsolved pair i/j
                            if(i !== j && !c2.value){
                                c2.setHint(value, false);  //j.hint for i.value = false
                            }
                        }
                    }
                    else{
                        numUnsolvedCells++;    
                    }
                }    
                
            });
            return numUnsolvedCells == 0; 
        },
        
        /**
         * Check for solved cells. Cells with only one hint set (Naked Singles).
         * This is the only place where a cell can have the value set in the solver. All other places only update hints
         */
        updateCellValues: function(){
            for(var i=0,cell; cell=this.cells[i]; i++){
                if(!cell.value){
                    var hints = cell.getHints();
                    if(hints.length == 1){
                        cell.setValue(hints[0], true);
                    }
                }
            }
        },

        //For each row/column/block, call f(group)
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
        
        
        /**
         * Gets an array of all hints set in cells array
         */
        getHints: function(cells){
            var hints = [];
            _.each(cells, function(cell){
                hints.push(cell.getHints());
            });
            //flatten all hints into one array, remove duplicates
            return _.union.apply(_, hints);   
        },

        
        
        /**
         * For each n-tuple in the list of items 
         * @param n - size of tuple
         * @param list - array of items.
         * @param f - callback function. Called with tuple - n length array
         * @param includeAll - true to any element, otherwise only include solved cell items.
         */
        forEachNTuple: function(n, list, f, includeAll){            
            var that=this;
            
            //recursively build tuple
            var impl = function(i, n, inTuple){ 
                var limit = list.length - (n-1);
                for(; i<limit ; i++){
                    if(includeAll || !list[i].value){
                        var tuple = inTuple.concat(list[i]);
                        if(n==1) f.call(that, tuple);
                        else{
                            impl(i+1, n-1, tuple);
                        }
                    }
                }
                
            };
            
            
            impl(0, n, []);
        }, 
        
        
        

      
        
        
        /**
         * Checks for naked pairs/triples. 4-tuples and above are too expensive and not likely to benifit, so leaving those out
         */
        checkNakedTuples: function(){
            
            this.forEachGroup(function(cells){
                for(var tupleSize=2; tupleSize <=3; tupleSize++){
                    this.forEachNTuple(tupleSize, cells, function(tuple){
                        
                        var hints = this.getHints(tuple);                        
                        if(hints.length == tupleSize){
                            var otherCells = _.difference(cells, tuple);
                            
                            for(var k=0, cell; cell = otherCells[k]; k++){
                                if(!cell.value){ 
                                    cell.setHints(hints, false);
                                }
                            }
                        }

                    });
                }
            });
            
        },
        
        
        /**
         * Look for hidden singles. Cases where only one cell in a group has hint h
         */
        checkHiddenSingles: function(){            
            this.forEachGroup(function(cells){
                t=0;
                for(var v=1; v<=9; v++){
                    var valueCell=null, numMatched=0; var c=0;
                    for(var i=0, cell; cell = cells[i]; i++){
                        if(!cell.value && cell.hints[v]){                        
                            valueCell = cell;
                            c=i;
                            numMatched++;
                            if(numMatched>1){
                                break;
                            }
                            
                        }                    
                    }
                    
                    if(numMatched == 1){
                        valueCell.resetHints([v]);
                    }
                }
                    
            });
        },
        
        
        
        checkHiddenTuples: function(){
            /**
             For each group
                 for each pair/triple of cells ( the n-tuple)
                     hints = hints(tuple)
                     otherHints = hints(non-tuple cells)
                     hiddenTupleHints = difference between hints and otherHints                     
                     if hints.length >= n, and hiddenTupleHints.lenght is exactly n, then hidden tuple is found                     
                         eliminate hints not in hiddenTupleHints             
             */
            
            this.forEachGroup(function(cells){
                for(var tupleSize=2; tupleSize <=3; tupleSize++){
                    this.forEachNTuple(tupleSize, cells, function(tuple){ 
                         
                        var tupleHints = this.getHints(tuple);                         
                         if(tupleHints.length >= tupleSize){
                             var otherCells = _.difference(cells, tuple);
                             var otherHints = this.getHints(otherCells); 
                             
                             //get hints that exist in the tuple, but not in other cells
                             var hiddenHints = _.difference(tupleHints, otherHints);
                             

                             //if none found, then this is a hidden tuple. Remove all other hints in the tuple
                             if(hiddenHints.length === tupleSize){
                                 _.each(tuple, function(cell){
                                     
                                     //for each hint h in cell
                                         //h = false if ! in hiddenHints
                                     for(var h=1; h<=9; h++){
                                         if(_.indexOf(hiddenHints, h) < 0){
                                             cell.setHint(h, false);
                                         }
                                     }
                                     
                                    
                                 });
                             }
                                 
                             
                         }
                    });
                }
            });
            
            
            
            
        },


        /**
            check for pointing pairs/triples, and box line reduction.
        */
        checkIntersections: function(){
            //divide each group into subgroups of 3 cells that intersect with another group
            //eg, a rows subgroups are [0,1,2], [3,4,5], and [6,7,8]
            //each subgroup belongs to a block and either a row or column

            for(var i=0; this.subGroups[i]; i++){
                var sg = this.subGroups[i];
                var sgHints = this.getHints(sg.cells);   
                var gA = _.difference(sg.block, sg.cells);
                var gB = _.difference(sg.rowCol, sg.cells);
                _.each([ [gA,gB], [gB,gA] ], function(g){
                    var uniqueHints = _.difference(sgHints, this.getHints(g[0]));                    
                    _.each(g[1], function(cell){
                        cell.setHints(uniqueHints, false);
                    },this); 
                }, this);                
            }
        }
        




        
    });
  
    
    
    var Cell = function(){
        this.hints = []; // 1-9, true/false. True if that number is possible
        this.setValue(null);   
    };  
    Cell.prototype = {
        setValue: function(val, isSolvedValue){
            if(val != this.value){
                $scope.numUpdates++;
            }
            for(var i=1; i<=9; i++){
                this.hints[i] = (!val) || (i === val);
            }
            this.value = val;
            this.isSolvedValue = isSolvedValue;
        },
        
        setHints: function(hints, value){
            for(var i=0, len=hints.length; i<len; i++){
                if(this.hints[hints[i]] != value){
                    $scope.numUpdates++;
                }
                this.hints[hints[i]] = value;
            }
        },
        
        toggleHint: function(hint, i, j){
            this.setHint(hint, !this.hints[hint]);
        },
        setHint: function(hint, value){
            if(this.hints[hint] != value){
                $scope.numUpdates++;
            }
            this.hints[hint] = value;
        },
        
        resetHints: function(hints){
            var h = this.getHints();
            $scope.numUpdates += h.length + hints.length - _.intersection(h, hints).length;
            
            
            this.hints = [];
            for(var i=0, len=hints.length; i<len; i++){              
                this.hints[hints[i]] = true;
            }  
            
            
        },
        getHints: function(){
            var hints = [];
            for(var i=1; i<=9; i++){
                if(this.hints[i]){
                    hints.push(i);
                }
            }
            return hints;
        },
        //returns true if any of the given hints are set
        hasHints: function(hints){
            for(var i=0, len=hints.length; i<len; i++){
                if(this.hints[hints[i]]){
                    return true;
                }
            }
        },

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
    
    
    
    
    $scope.init();
}











