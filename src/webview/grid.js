let array = eval('[[hhh]]')
let container = document.createElement('div');
container.setAttribute('class', 'container');
document.body.appendChild(container);
array.forEach(rowValue => {
   let row = document.createElement('div');
   row.setAttribute('class', 'grid-row');
   container.appendChild(row);
   rowValue.forEach(cellValue => {
      let cell = document.createElement('div');
      cell.setAttribute('class', 'grid-cell');
      cell.textContent = cellValue;
      row.appendChild(cell);
   });
});