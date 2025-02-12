import { Injectable } from '@angular/core';
import { Elem } from 'src/app/bankelements/models/element';
import { CbankService } from 'src/app/bankelements/services/cbank.service';
import { Nod } from 'src/app/models/node';
import { GlobalService } from 'src/app/services/global.service';

export interface Cell{
  xoffset?:number;   //смещение
  item?:   string;    //название элемента
  nod?:    Nod;       //год
  fsvg?:   string;    //полный SVG элемента
  wireb?:  string[];  //начало основного провода
  wiree?:  string[];  //конец основного провода
  wn?:     boolean;   //нулевой провод
  wp?:     boolean;   //защитный провод
}
@Injectable({
  providedIn: 'root'
})
export class SchemeService {
  grid:Cell[][] = [[],[]];
  xoff:number = 0;
  tree:Cell;

  constructor(
    public cbankService: CbankService,
    public globalService: GlobalService) {}

  Init() {
    if(this.globalService.tree.root){ //выходим, если нет рута
      this.xoff = 0;
      this.grid.length = 0;

      if (!this.grid[0]){this.grid.push([])};
      this.grid[0][0] = {
        item:'tree', 
        wiree:this.CheckCont(this.globalService.tree.properties),
      };
      this.Construct(this.globalService.tree.root, 1, 0);
      this.DrawNodes();
      this.DrawBus();
      this.DrawWires();
      console.log(this.grid);
    }
  }

  DrawWires(){
    for (var r = this.grid.length - 1; r >= 0; r--) {
      for (var c = this.grid[r].length - 1; c >= 0; c--) {
        let cell:Cell = this.grid[r][c];
        if (cell.item == 'wire'){
          cell.wiree = this.grid[r+1][c].wireb;
          cell.wireb = this.grid[r-1][c].wiree;
          //маркировка наличия нуля в основном проводе без ответвлений
          if (cell.wireb.filter(x => cell.wiree.includes(x)).filter(x => ['N'].includes(x)).length > 0) {
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMN').svg;
          }
          //маркировка наличия защитного проводника в основном проводе без ответвлений
          if (cell.wireb.filter(x => cell.wiree.includes(x)).filter(x => ['PE'].includes(x)).length > 0) {
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMPE').svg;
          }

          //маркировка текста фаз на основных проводниках
          let phase:string[] = cell.wiree.filter(e => !['N','PE'].includes(e));
          for (var p = phase.length-1; p >=0; p--) {
            cell.fsvg += '<text x="45" y="'+ (60 - (phase.length-p)*9) +'" style="font: italic 11px sans-serif; fill:#'+this.cbankService.cl+';">' + phase[p] + '</text>';
          }
          //маркировка фазных насечек на основных проводниках
          let markL:string = phase.join('').replace(/[1-3]/g,"")
          if(this.cbankService.cbank.find(e => e.name =='wireM' + markL,"")){
             cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireM' + cell.wiree.filter(e => !['N','PE'].includes(e)).join('').replace(/[1-3]/g,"")).svg;
          }
          //отрисовка основных проводов
          if (this.grid[r-1][c].wiree.length > 0 && cell.wiree.length > 0 ){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wire').svg;
          }

          let difference = cell.wiree.filter(x => !cell.wireb.includes(x));
          if (difference.includes('N')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireNup').svg;
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMN').svg;
            this.grid[r-1][c].wn = true;
            cell.wn = true; //для отрисовки шины
          }

          if (difference.includes('PE')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wirePEup').svg;
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMPE').svg;
            this.grid[r-1][c].wp = true;
            cell.wp = true; //для отрисовки шины
          }

          difference = cell.wireb.filter(x => !cell.wiree.includes(x));
          if (difference.includes('N')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireNdown').svg;
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMN').svg;
          }else{
            if (this.grid[r+1][c].wn){
              cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireN').svg;
              this.grid[r-1][c].wn = true;
            }
          }

          if (difference.includes('PE')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wirePEdown').svg;
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireMPE').svg;
          }else{
            if (this.grid[r+1][c].wp){
              cell.fsvg += this.cbankService.cbank.find(e => e.name =='wirePE').svg;
              this.grid[r-1][c].wp = true;
            }
          }
        }

        if(cell.nod){
          if(cell.wn){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wireN').svg;
            this.grid[r-1][c].wn = true;
          }
          if(cell.wp){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='wirePE').svg;
            this.grid[r-1][c].wp = true;
          }
        }
        if (cell.item == 'bus'){
          cell.fsvg += this.cbankService.cbank.find(e => e.name =='busLd').svg;
          if (c==0){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busLu').svg;
            cell.fsvg += '<text x="5" y="'+ (this.cbankService.bly - 5) +'" style="font: italic 12px sans-serif; fill:#'+this.cbankService.cl+';">' + cell.wireb.filter(e => !['N','PE'].includes(e)).join() + '</text>';
            if(cell.wn){
              cell.fsvg += this.cbankService.cbank.find(e => e.name =='busNu').svg;
            }
            if(cell.wp){
              cell.fsvg += this.cbankService.cbank.find(e => e.name =='busPEu').svg;
            }
            
          }
          
          if(this.grid[r+1][c].wn){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busNd').svg;
          }
          console.log (this.grid[r+1][c].wp);
          if(cell.wp){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busPEd').svg;
          }
        }
      }
    }
  }

  CheckCont(p: Object) :string[] {
    let ch:string[] = ['P1', 'P2', 'P3', 'P4', 'P5'];
    let co:string[] = ['L1', 'L2', 'L3', 'N', 'PE'];
    let arr:string[] = [];
    for (var s in p) {
      if (ch.includes(s) && co.includes(p[s])){
        arr.push(p[s]);
      }
    } 
    return arr
  }

  DrawBus(){
    let phtext:string[] = ['L1', 'L2', 'L3'];
    phtext = phtext.filter(x => this.CheckCont(this.globalService.tree.properties).includes(x));
    console.log(phtext.join());
    for (var { row, r } of this.grid.map((row, r) => ({ row, r }))) {
      for (var { cell, c } of row.map((cell, c) => ({ cell, c }))) {  
        if (cell.item == 'bus'){
          if (phtext.join().length > 1){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busL').svg;
            cell.wireb = phtext;
            cell.wiree = phtext;
          }
          if (this.CheckCont(this.globalService.tree.properties).includes('N')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busN').svg;
            cell.wn = true;
          }
          if (this.CheckCont(this.globalService.tree.properties).includes('PE')){
            cell.fsvg += this.cbankService.cbank.find(e => e.name =='busPE').svg;
            cell.wp = true;
          }
        }
      }
    }
  }

  DrawNodes(){
    for (var { row, r } of this.grid.map((row, r) => ({ row, r }))) {
      for (var { cell, c } of row.map((cell, c) => ({ cell, c }))) {  
        if (cell.nod){
          let ce =this.cbankService.cbank.find(e => e.nnames.includes(cell.nod.name));
          cell.fsvg += ce.svg;
          ce.text1 = cell.nod.title;
          cell.fsvg += Elem.getText1(ce);
          cell.wireb = this.CheckCont(cell.nod.properties);
          cell.wiree = this.CheckCont(cell.nod.properties)
        }
      }
    }
  }

  Construct(p:string, r:number, c:number){
    let n:Nod = this.globalService.nodes.find(r => r.id === p); //ищем нод
      
    if (!this.grid[r]){this.grid.push([])};
    this.grid[r][c] = {xoffset:this.xoff,item:'wire'};
    r++;

    if (!this.grid[r]){this.grid.push([])};
    this.grid[r][c] = {xoffset:this.xoff,nod:n};
    r++;
      
    let childs = n.children;
    if (typeof childs != 'undefined'){
      if (childs.length >1){
        if (!this.grid[r]){this.grid.push([])};
        this.grid[r][c] = {xoffset:this.xoff,item:'wire'};
        r++;
  
        if (!this.grid[r]){this.grid.push([])};
        for (let i = 0; i < childs.length; i += 1) {
        this.grid[r][c+i] = {xoffset:this.xoff,item:'bus'};
        } 
        r++;
      }
      if (childs.length>1){
        this.xoff = -50;
      }
      for (var ch of childs) {
        
        // this.xoff = -50;
        this.Construct(ch, r, c);
        c++;
      }
    }
  }
}
