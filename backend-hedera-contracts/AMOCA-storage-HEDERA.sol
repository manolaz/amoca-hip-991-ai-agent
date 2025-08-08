// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleStorage
 * @dev A contract demonstrating storage of different data types with getter and setter functions
 */
contract SimpleStorage {
    // State variables
    uint256 private storedNumber;
    string private storedText;
    
    // Struct to demonstrate complex data type
    struct Person {
        uint256 id;
        string name;
    }
    
    // Array and mapping to demonstrate collection types
    Person[] private people;
    mapping(uint256 => string) private idToName;
    
    // Events
    event NumberStored(uint256 number);
    event TextStored(string text);
    event PersonAdded(uint256 id, string name);
    
    /**
     * @dev Store a new number
     * @param _number The number to store
     */
    function storeNumber(uint256 _number) public {
        storedNumber = _number;
        emit NumberStored(_number);
    }
    
    /**
     * @dev Retrieve the stored number
     * @return The value of the stored number
     */
    function retrieveNumber() public view returns (uint256) {
        return storedNumber;
    }
    
    /**
     * @dev Store a new text string
     * @param _text The text to store
     */
    function storeText(string memory _text) public {
        storedText = _text;
        emit TextStored(_text);
    }
    
    /**
     * @dev Retrieve the stored text
     * @return The stored text string
     */
    function retrieveText() public view returns (string memory) {
        return storedText;
    }
    
    /**
     * @dev Add a person to the array and mapping
     * @param _id The person's ID
     * @param _name The person's name
     */
    function addPerson(uint256 _id, string memory _name) public {
        people.push(Person(_id, _name));
        idToName[_id] = _name;
        emit PersonAdded(_id, _name);
    }
    
    /**
     * @dev Get a person from the array by index
     * @param _index The array index
     * @return id The person's ID
     * @return name The person's name
     */
    function getPerson(uint256 _index) public view returns (uint256 id, string memory name) {
        require(_index < people.length, "Index out of bounds");
        Person memory person = people[_index];
        return (person.id, person.name);
    }
    
    /**
     * @dev Get a name from the mapping by ID
     * @param _id The person's ID
     * @return The person's name
     */
    function getNameById(uint256 _id) public view returns (string memory) {
        return idToName[_id];
    }
    
    /**
     * @dev Get the count of people stored
     * @return The length of the people array
     */
    function getPeopleCount() public view returns (uint256) {
        return people.length;
    }
}
